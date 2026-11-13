import express from "express";
import next from "next";
import dotenv from "dotenv";
import makeWASocket, {
    fetchLatestBaileysVersion,
    initAuthCreds,
    BufferJSON,
    proto,
    DisconnectReason
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { MongoClient } from "mongodb";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = Number(process.env.PORT) || 10000;

const server = express();
server.use(express.json({ limit: "1mb" }));

let mongoClientPromise = null;
let collection = null;

async function getCollection() {
    if (collection) return collection;
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");

    if (!mongoClientPromise) {
        mongoClientPromise = (async () => {
            const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
            await client.connect();
            return client;
        })().catch(error => { mongoClientPromise = null; throw error; });
    }
    const client = await mongoClientPromise;
    collection = client.db("raees_bot").collection("sessions");
    return collection;
}

async function useMongoAuthState(phoneNumber) {
    const db = await getCollection();
    const writeData = async (key, value) => {
        await db.updateOne({ _id: `${phoneNumber}_${key}` }, { $set: { data: JSON.stringify(value, BufferJSON.replacer), updatedAt: new Date() } }, { upsert: true });
    };
    const readData = async (key) => {
        const doc = await db.findOne({ _id: `${phoneNumber}_${key}` });
        return doc && doc.data ? JSON.parse(doc.data, BufferJSON.reviver) : null;
    };
    const removeData = async (key) => { await db.deleteOne({ _id: `${phoneNumber}_${key}` }); };
    const creds = (await readData("creds")) || initAuthCreds();

    const state = {
        creds,
        keys: {
            get: async (type, ids) => {
                const result = {};
                await Promise.all(ids.map(async id => {
                    let value = await readData(`${type}-${id}`);
                    if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
                    result[id] = value;
                }));
                return result;
            },
            set: async (data) => {
                const operations = [];
                for (const category in data) {
                    for (const id in data[category]) {
                        const value = data[category][id];
                        const key = `${category}-${id}`;
                        operations.push(value ? writeData(key, value) : removeData(key));
                    }
                }
                await Promise.all(operations);
            }
        }
    };
    const saveCreds = () => writeData("creds", state.creds);
    return { state, saveCreds };
}

const activeSockets = new Map();
let baileysVersionPromise = null;

async function getBaileysVersion() {
    if (!baileysVersionPromise) {
        baileysVersionPromise = fetchLatestBaileysVersion().then(result => result.version).catch(error => {
            baileysVersionPromise = null; throw error;
        });
    }
    return baileysVersionPromise;
}

const logger = Pino({ level: "silent" });

async function startSocket(phoneNumber, onPairCode = null) {
    if (activeSockets.has(phoneNumber)) {
        try { activeSockets.get(phoneNumber).end(undefined); } catch(e) {}
        activeSockets.delete(phoneNumber);
    }

    const { state, saveCreds } = await useMongoAuthState(phoneNumber);
    const version = await getBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ["Ubuntu", "Chrome", "120.0.0"],
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        syncFullHistory: false
    });

    activeSockets.set(phoneNumber, sock);

    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;
    let handler = null;

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr && !pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;
            try {
                console.log(`[Socket] QR received, generating code...`);
                const code = await Promise.race([
                    sock.requestPairingCode(phoneNumber),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
                ]);
                if (typeof onPairCode === "function") onPairCode(code);
            } catch (error) {
                console.error(`❌ Socket pairing error:`, error.message);
                if (typeof onPairCode === "function") onPairCode(null, error);
            }
        }

        if (connection === "open") {
            console.log(`✅ WhatsApp connected: ${phoneNumber}`);
            
            // 🚨 لود کردن هندلر دقیقاً بعد از وصل شدن
            if (!handler) {
                try {
                    console.log(`⏳ Loading handler.js...`);
                    const module = await import("./handler.js");
                    handler = module.default;
                    console.log(`✅ Handler.js loaded successfully!`);
                } catch (error) {
                    console.error(`❌ CRITICAL: Handler.js crashed during load. The error is:`);
                    console.error(error); // چاپ کامل خطا برای پیدا کردن فایل خراب
                }
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Disconnected: ${phoneNumber}`, statusCode || "Unknown");
            activeSockets.delete(phoneNumber);
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => startSocket(phoneNumber), 2500);
            }
        }
    });

    // 🚨 رویداد پیام‌ها
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const m = messages[0];
        if (!m || !m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        console.log(`📩 [MESSAGE] From: ${m.key.remoteJid} | Body: "${body}"`);

        if (handler) {
            try {
                await handler(sock, m.key.remoteJid, body, m);
            } catch (err) {
                console.error("❌ Error in handler execution:", err.message);
            }
        } else {
            console.log("⚠️ Message received but handler is NOT LOADED.");
        }
    });

    return sock;
}

server.post("/api/pairing", async (req, res) => {
    const phoneNumber = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(phoneNumber)) return res.status(400).json({ success: false, error: "شماره نامعتبر است." });

    try {
        const db = await getCollection();
        await db.deleteMany({ _id: { $regex: new RegExp(`^${phoneNumber}_`) } });

        const code = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout")), 60000);
            startSocket(phoneNumber, (c, err) => {
                clearTimeout(timeout);
                if (err) reject(err);
                if (c) resolve(c);
            }).catch(reject);
        });

        return res.json({ success: true, code });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

server.get("/health", async (req, res) => {
    return res.json({ success: true, activeSessions: activeSockets.size });
});

async function startServer() {
    await nextApp.prepare();
    server.all("*", (req, res) => handle(req, res));
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server listening on port ${PORT}`);
    });
}

startServer().catch(error => process.exit(1));
