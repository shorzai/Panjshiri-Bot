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

        console.log(`⏳ 1. Creating session for ${phoneNumber}...`);
        const sock = await createSession(phoneNumber);
        console.log(`✅ 2. Session created.`);

        if (sock.authState.creds.registered) {
            return res.json({
                success: false,
                error: "این شماره قبلاً به ربات متصل شده است."
            });
        }

        console.log(`⏳ 3. Requesting pairing code...`);
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`✅ 4. Code received: ${code}`);

        if (!code) {
            throw new Error("کد دریافت نشد. لطفاً دوباره تلاش کنید.");
        }

        return res.json({ success: true, code });

    } catch (error) {
        console.error("❌ Pairing error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "خطا در تولید کد."
        });
    }
}
