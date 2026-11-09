import express from "express";
import next from "next";
import dotenv from "dotenv";
import makeWASocket, { initAuthCreds, BufferJSON, proto } from "@whiskeysockets/baileys";
import Pino from "pino";
import { MongoClient } from "mongodb";

dotenv.config();
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 10000;

const server = express();
server.use(express.json());

let cachedMongoClient = null;
async function useMongoAuthState(phoneNumber) {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is missing");

    if (!cachedMongoClient) {
        cachedMongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
        await cachedMongoClient.connect();
    }
    const collection = cachedMongoClient.db("raees_bot").collection("sessions");

    const writeData = async (data, key) => {
        await collection.updateOne({ _id: `${phoneNumber}_${key}` }, { $set: { data: JSON.stringify(data, BufferJSON.replacer) } }, { upsert: true });
    };
    const readData = async (key) => {
        const doc = await collection.findOne({ _id: `${phoneNumber}_${key}` });
        return doc ? JSON.parse(doc.data, BufferJSON.reviver) : null;
    };
    const removeData = async (key) => {
        await collection.deleteOne({ _id: `${phoneNumber}_${key}` });
    };
    const creds = (await readData("creds")) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: () => writeData(creds, "creds"),
    };
}

server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        console.log(`[API] Request for ${phoneNumber}`);
        const { state, saveCreds } = await useMongoAuthState(phoneNumber);
        
        const sock = makeWASocket({
            auth: state,
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"]
        });

        sock.ev.on("creds.update", saveCreds);

        if (sock.authState.creds.registered) {
            return res.json({ success: false, error: "این شماره قبلاً متصل شده است." });
        }

        // ⏳ دقیقاً ۵ ثانیه صبر می‌کنیم (مثل کدی که کد ۸ رقمی داد)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // گرفتن کد ۸ رقمی
        const code = await sock.requestPairingCode(phoneNumber);
        
        if (!code) throw new Error("کد دریافت نشد.");
        
        console.log(`✅ Code generated for ${phoneNumber}: ${code}`);
        
        // 🚨 اینجا sock.end() رو نداریم تا قطع نشه.

        // 🟢 وقتی کاربر کد رو زد و وصل شد، ربات اصلی لود میشه
        sock.ev.on("connection.update", async (update) => {
            if (update.connection === "open") {
                console.log(`✅ CONNECTED: ${phoneNumber}`);
                const { default: handler } = await import("./handler.js");
                sock.ev.on("messages.upsert", async ({ messages }) => {
                    const m = messages[0];
                    if (!m?.message) return;
                    await handler(sock, m.key.remoteJid, m.message.conversation || m.message.extendedTextMessage?.text || "", m);
                });
            }
        });

        return res.json({ success: true, code });

    } catch (error) {
        console.error("❌ Pairing Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

server.get("/health", (req, res) => res.send("OK"));
nextApp.prepare().then(() => {
    server.all("*", (req, res) => handle(req, res));
    server.listen(PORT, () => console.log(`🚀 Web server listening on port ${PORT}`));
});
