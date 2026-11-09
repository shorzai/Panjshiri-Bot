import express from "express";
import next from "next";
import dotenv from "dotenv";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import Pino from "pino";
import fs from "fs";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 10000;

const server = express();
server.use(express.json());

// 🚀 حافظه‌ای برای نگه داشتن سوکت‌ها (تا بعد از کد دادن قطع نشوند)
const activeSockets = new Map();

server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        console.log(`[API] Request for ${phoneNumber}`);

        // اگر از قبل سوکت باز است، از همون استفاده کن
        if (activeSockets.has(phoneNumber)) {
            console.log(`[API] Using existing socket for ${phoneNumber}`);
        }

        const sessionDir = `./session_${phoneNumber}`;
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket({
            auth: state,
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"]
        });

        // 🚨 ذخیره سوکت در حافظه
        activeSockets.set(phoneNumber, sock);
        sock.ev.on("creds.update", saveCreds);

        // منتظر سیگنال آماده شدن واتساپ می‌مانیم
        let code = null;
        const codePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("واتساپ پاسخ نداد. دوباره تلاش کنید.")), 20000);

            sock.ev.on("connection.update", async (update) => {
                if (update.qr) {
                    try {
                        clearTimeout(timeout);
                        console.log(`[API] WhatsApp ready, requesting code...`);
                        code = await sock.requestPairingCode(phoneNumber);
                        resolve();
                    } catch (err) {
                        clearTimeout(timeout);
                        reject(err);
                    }
                }
            });
        });

        await codePromise;

        if (!code) throw new Error("کد دریافت نشد.");

        console.log(`[API] Success: ${code}`);
        
        // 🚨 اینجا دیگه sock.end() نداریم! سوکت زنده می‌مونه تا کاربر کد رو بزنه.

        return res.json({ success: true, code });

    } catch (error) {
        console.error("❌ Pairing Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

server.get("/health", (req, res) => res.send("OK"));

nextApp.prepare().then(() => {
    server.all("*", (req, res) => handle(req, res));
    server.listen(PORT, () => {
        console.log(`🚀 Web server listening on port ${PORT}`);
    });
});
