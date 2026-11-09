import express from "express";
import next from "next";
import dotenv from "dotenv";
import { createSession } from "./bot.js";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 3000;

const server = express();
server.use(express.json());

// 🚀 مسیر اختصاصی برای دریافت کد (اینجا اتصال هیچ‌وقت قطع نمیشه)
server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        console.log(`[Express] Creating session for ${phoneNumber}...`);
        const sock = await createSession(phoneNumber);

        if (sock.authState.creds.registered) {
            return res.json({ success: false, error: "این شماره قبلاً متصل شده است." });
        }

        // صبر میکنیم سوکت به واتساپ وصل بشه (بدون تایم اوت)
        let code = null;
        let attempts = 0;
        while (!code && attempts < 100) { // حداکثر 10 ثانیه
            try {
                code = await sock.requestPairingCode(phoneNumber);
            } catch (e) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
        }

        if (!code) throw new Error("واتساپ پاسخ نداد.");
        
        console.log(`[Express] Code generated: ${code}`);
        return res.json({ success: true, code });

    } catch (error) {
        console.error("[Express] Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

server.get("/health", (req, res) => res.send("OK"));

// بقیه درخواست‌ها به Next.js
server.all("*", (req, res) => handle(req, res));

server.listen(PORT, () => {
    console.log(`🚀 Web server listening on port ${PORT}`);
});
