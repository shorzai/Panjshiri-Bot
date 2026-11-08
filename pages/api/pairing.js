import { createSession } from "../../bot.js";

export const maxDuration = 60; 
export const dynamic = "force-dynamic";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: "شماره نامعتبر است. مثال: 93781234567"
            });
        }

        const sock = await createSession(phoneNumber);

        if (sock.authState.creds.registered) {
            return res.json({
                success: false,
                error: "این شماره قبلاً به ربات متصل شده است."
            });
        }

        let code = null;
        let attempts = 0;
        const maxAttempts = 15;

        while (!code && attempts < maxAttempts) {
            try {
                code = await sock.requestPairingCode(phoneNumber);
            } catch (e) {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
            }
        }

        if (!code) {
            throw new Error("واتساپ پاسخ نداد. لطفاً چند لحظه دیگر دوباره تلاش کنید.");
        }

        console.log(`🔑 Pairing code for ${phoneNumber}: ${code}`);
        return res.json({ success: true, code });

    } catch (error) {
        console.error("Pairing error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "خطا در تولید کد. لطفاً دوباره تلاش کنید."
        });
    }
}
