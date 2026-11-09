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

// 🚀 1. باز کردن پورت و بالا آوردن وب‌سرور به محض روشن شدن
server.listen(PORT, () => {
    console.log(`🚀 Web server listening on port ${PORT}`);
});

server.get("/health", (req, res) => res.send("OK"));

// 🤖 2. مسیر دریافت کد
server.post("/api/pairing", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        console.log(`[Express] Request for ${phoneNumber}...`);

        // 👈 ربات رو فقط زمانی که نیازه، در پس‌زمینه لود می‌کنیم تا سرور کرش نکنه
        const { createSession } = await import("./bot.js");
        const sock = await createSession(phoneNumber);

        if (sock.authState.creds.registered) {
            return res.json({ success: false, error: "این شماره قبلاً متصل شده است." });
        }

        let code = null;
        let attempts = 0;
        while (!code && attempts < 100) {
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

// 🌐 3. لود کردن Next.js
nextApp.prepare().then(() => {
    server.all("*", (req, res) => handle(req, res));
    console.log("✅ Next.js prepared successfully");
}).catch(err => {
    console.error("Next.js error:", err);
});
