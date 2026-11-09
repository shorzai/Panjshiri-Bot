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

// مسیر گرفتن کد (دقیقاً مثل ترموکس، اما بدون تاخیر)
server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        const sessionDir = `./session_${phoneNumber}`;
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        // 🚀 استفاده از برچسب مرورگر استاندارد برای جلوگیری از رد شدن توسط واتساپ
        const sock = makeWASocket({
            auth: state,
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"] // برچسب استاندارد
        });

        sock.ev.on("creds.update", saveCreds);

        // 🚀 منتظر سیگنال آماده شدن واتساپ (qr) می‌مانیم و بلافاصله کد را می‌گیریم
        let code = null;
        const pairingPromise = new Promise((resolve, reject) => {
            sock.ev.on("connection.update", async (update) => {
                const { qr, connection } = update;
                if (qr) {
                    try {
                        console.log(`[API] QR received, requesting code for ${phoneNumber}...`);
                        code = await sock.requestPairingCode(phoneNumber);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
                if (connection === "close") {
                    reject(new Error("Connection closed before pairing."));
                }
            });
        });

        // حداکثر 15 ثانیه منتظر می‌مانیم
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("زمان دریافت کد به پایان رسید.")), 15000)
        );

        await Promise.race([pairingPromise, timeoutPromise]);

        if (!code) throw new Error("کد دریافت نشد.");

        try { sock.end(undefined); } catch(e) {}

        return res.json({ success: true, code });

    } catch (error) {
        console.error("[API] Pairing error:", error.message);
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
