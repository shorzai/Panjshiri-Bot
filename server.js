import express from "express";
import next from "next";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 10000;

const server = express();
server.use(express.json());

server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        // 🚀 استفاده از سیستم اصلی ربات (bot.js) برای ساخت سشن
        const { createSession } = await import("./bot.js");
        const sock = await createSession(phoneNumber);

        if (sock.authState.creds.registered) {
            return res.json({ success: false, error: "این شماره قبلاً متصل شده است." });
        }

        // کمی صبر می‌کنیم تا سوکت به واتساپ وصل شود
        await new Promise(resolve => setTimeout(resolve, 4000));

        // درخواست کد
        const code = await sock.requestPairingCode(phoneNumber);
        
        if (!code) throw new Error("کد دریافت نشد.");
        
        console.log(`✅ Code generated: ${code}`);
        
        // 🚨 اینجا دیگه اتصال رو قطع نمی‌کنیم! می‌ذاریم زنده بمونه تا کاربر کد رو بزنه.
        
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
