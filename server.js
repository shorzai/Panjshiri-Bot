import express from "express";
import next from "next";
import dotenv from "dotenv";
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import Pino from "pino";
import fs from "fs";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 10000;

const server = express();
server.use(express.json());

// مسیر گرفتن کد (دقیقاً مثل ترموکس)
server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        const sessionDir = `./session_${phoneNumber}`;
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            auth: state,
            version,
            logger: Pino({ level: "silent" }),
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            printQRInTerminal: false
        });

        sock.ev.on("creds.update", saveCreds);

        // ⏳ صبر می‌کنیم (مثل وقتی که کاربر داره شماره رو تایپ می‌کنه)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // حالا کد رو می‌گیریم
        const code = await sock.requestPairingCode(phoneNumber);
        
        if (!code) throw new Error("کد دریافت نشد.");
        
        console.log(`✅ Code generated: ${code}`);
        try { sock.end(undefined); } catch(e) {}
        
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
