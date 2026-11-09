import { createSession } from "../../bot.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "شماره نامعتبر است." });
        }

        const sock = await createSession(phoneNumber);
        
        if (sock.authState.creds.registered) {
            return res.json({ success: false, error: "این شماره قبلاً متصل شده است." });
        }

        // 🚀 حلقه بی‌نهایت: تا وقتی کد نده، دست برنمی‌داره (بدون تایم‌اوت)
        let code = null;
        while (!code) {
            try {
                code = await sock.requestPairingCode(phoneNumber);
            } catch (e) {
                await new Promise(r => setTimeout(r, 100)); // هر 100 میلی‌ثانیه یه بار امتحان میکنه
            }
        }

        return res.json({ success: true, code });

    } catch (error) {
        console.error("Pairing error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
