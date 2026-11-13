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

// ======================================
// MONGODB SETUP
// ======================================
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

// ======================================
// SOCKET & HANDLER SETUP
// ======================================
const activeSockets = new Map();
const reconnectTimers = new Map();
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
    // Kill existing socket if any to avoid conflicts
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

    let saveQueue = Promise.resolve();
    sock.ev.on("creds.update", () => {
        saveQueue = saveQueue.then(() => saveCreds()).catch(error => console.error("Mongo save error:", error.message));
    });

    let pairingRequested = false;
    let handlerAttached = false;

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr && !pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;
            try {
                console.log(`[Socket] QR received, generating code...`);
                const code = await sock.requestPairingCode(phoneNumber);
                if (typeof onPairCode === "function") onPairCode(code);
            } catch (error) {
                console.error(`[Socket] Pairing error:`, error.message);
                if (typeof onPairCode === "function") onPairCode(null, error);
            }
        }

        if (connection === "open") {
            console.log(`✅ WhatsApp connected: ${phoneNumber}`);
            const timer = reconnectTimers.get(phoneNumber);
            if (timer) { clearTimeout(timer); reconnectTimers.delete(phoneNumber); }

            if (!handlerAttached) {
                handlerAttached = true;
                try {
                    console.log(`⏳ Loading handler.js...`);
                    const { default: handler } = await import("./handler.js");
                    console.log(`✅ Handler.js loaded successfully!`);
                    
                    sock.ev.on("messages.upsert", async ({ messages, type }) => {
                        if (type !== "notify") return;

                        for (const m of messages || []) {
                            // Ignore messages sent by the bot itself
                            if (!m?.message || !m?.key?.remoteJid || m.key.fromMe) continue;

                            try {
                                const msg = m.message;
                                const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.documentMessage?.caption || "";
                                
                                if (!body) continue;
                                
                                console.log(`📩 Received: "${body}" from ${m.key.remoteJid}`);
                                
                                if (body.trim() === "!ping" || body.trim() === ".ping") {
                                    await sock.sendMessage(m.key.remoteJid, { text: "🏓 Pong! (Direct Server Test)" }, { quoted: m });
                                    console.log(`✅ Sent direct test reply!`);
                                }

                                if (handler) {
                                    await handler(sock, m.key.remoteJid, body, m);
                                }
                                
                            } catch (error) {
                                console.error("❌ MSG ERROR:", error.message);
                            }
                        }
                    });

                } catch (error) {
                    console.error("❌ CRITICAL: Handler loading error:", error.message);
                    handlerAttached = false;
                }
            }
        }

        if (connection === "close") {
            await saveQueue;
            if (activeSockets.get(phoneNumber) !== sock) return;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Disconnected: ${phoneNumber}`, statusCode || "Unknown");
            activeSockets.delete(phoneNumber);

            if (statusCode === DisconnectReason.loggedOut) return;
            
            if (!reconnectTimers.has(phoneNumber)) {
                const timer = setTimeout(async () => {
                    reconnectTimers.delete(phoneNumber);
                    try { await startSocket(phoneNumber); } catch (e) {}
                }, 2500);
                reconnectTimers.set(phoneNumber, timer);
            }
        }
    });

    return sock;
}

// ======================================
// PAIRING API
// ======================================
const pendingPairings = new Map();

server.post("/api/pairing", async (req, res) => {
    const phoneNumber = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(phoneNumber)) return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
    if (pendingPairings.has(phoneNumber)) return res.status(409).json({ success: false, error: "در حال اجرا است." });

    pendingPairings.set(phoneNumber, true);
    let responseSent = false;
    let timeout;

    try {
        // 🚨 پاک کردن سشن‌های قبلی از دیتابیس تا واتساپ مجبور بشه کد جدید بده
        const db = await getCollection();
        await db.deleteMany({ _id: { $regex: new RegExp(`^${phoneNumber}_`) } });
        console.log(`[API] Cleared old sessions for ${phoneNumber}`);

        // پاک کردن سوکت‌های در حافظه
        if (activeSockets.has(phoneNumber)) {
            try { activeSockets.get(phoneNumber).end(undefined); } catch(e) {}
            activeSockets.delete(phoneNumber);
        }

        const codePromise = new Promise((resolve, reject) => {
            timeout = setTimeout(() => reject(new Error("واتساپ پاسخ نداد. لطفا دوباره تلاش کنید.")), 60000);
            startSocket(phoneNumber, (code, error) => {
                if (responseSent) return;
                if (error) reject(error);
                if (code) resolve(code);
            }).catch(reject);
        });

        const code = await codePromise;
        clearTimeout(timeout);
        responseSent = true;
        return res.json({ success: true, code });
    } catch (error) {
        if (timeout) clearTimeout(timeout);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        pendingPairings.delete(phoneNumber);
    }
});

server.get("/health", async (req, res) => {
    try {
        const db = await getCollection();
        await db.database.command({ ping: 1 });
        return res.json({ success: true, mongodb: "connected", activeSessions: activeSockets.size });
    } catch (error) {
        return res.status(503).json({ success: false, mongodb: "disconnected", error: error.message });
    }
});

async function startServer() {
    await nextApp.prepare();
    server.all("*", (req, res) => handle(req, res));
    server.listen(PORT, "0.0.0.0", async () => {
        console.log(`🚀 Server listening on port ${PORT}`);
    });
}

startServer().catch(error => process.exit(1));
