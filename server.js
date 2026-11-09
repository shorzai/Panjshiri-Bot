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

const pairingCodes = new Map();
const pairingErrors = new Map();

// مسیر شروع گرفتن کد (فقط درخواست می‌دهد و منتظر می‌ماند)
server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        if (pairingCodes.has(phoneNumber)) {
            return res.json({ success: true, code: pairingCodes.get(phoneNumber) });
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

        sock.ev.on("creds.update", saveCreds);

        // 🚀 اینجا منتظر سیگنال آماده شدن واتساپ می‌مانیم
        sock.ev.on("connection.update", async (update) => {
            const { qr } = update;
            if (qr) {
                try {
                    console.log(`[API] Requesting code for ${phoneNumber}...`);
                    const code = await sock.requestPairingCode(phoneNumber);
                    pairingCodes.set(phoneNumber, code);
                    console.log(`[API] Success: ${code}`);
                    sock.end(undefined); 
                } catch (err) {
                    console.error(`[API] Error:`, err.message);
                    pairingErrors.set(phoneNumber, err.message);
                }
            }
        });

        return res.json({ success: true, processing: true });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// مسیر چک کردن وضعیت (سایت هر ۲ ثانیه این را صدا می‌زند)
server.get("/api/pairing/status", (req, res) => {
    const { phoneNumber } = req.query;
    if (pairingCodes.has(phoneNumber)) {
        return res.json({ success: true, code: pairingCodes.get(phoneNumber) });
    }
    if (pairingErrors.has(phoneNumber)) {
        return res.json({ success: false, error: pairingErrors.get(phoneNumber) });
    }
    return res.json({ success: true, processing: true });
});

server.get("/health", (req, res) => res.send("OK"));

nextApp.prepare().then(() => {
    server.all("*", (req, res) => handle(req, res));
    server.listen(PORT, () => {
        console.log(`🚀 Web server listening on port ${PORT}`);
    });
});
