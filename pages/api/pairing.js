import { createSession } from "../../bot.js";
import fs from "fs";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        // پاک کردن فایل کد قبلی (اگر وجود دارد)
        const codeFile = `./temp_code_${phoneNumber}.txt`;
        if (fs.existsSync(codeFile)) fs.unlinkSync(codeFile);

        // شروع فرآیند در پس‌زمینه
        createSession(phoneNumber).catch(e => console.error(e));

        // انتظار برای تولید کد (حداکثر ۱۵ ثانیه)
        let code = null;
        let attempts = 0;
        while (!code && attempts < 150) {
            if (fs.existsSync(codeFile)) {
                code = fs.readFileSync(codeFile, "utf8");
                fs.unlinkSync(codeFile); // پاک کردن فایل بعد از خواندن
            } else {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
        }

        if (!code) {
            throw new Error("زمان تولید کد به پایان رسید. لطفا دوباره تلاش کنید.");
        }

        return res.json({ success: true, code });

    } catch (error) {
        console.error("Pairing error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
