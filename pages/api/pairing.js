import { createSession } from "../../bot.js";

const pending = new Map();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    const phoneNumber = String(
        req.body?.phoneNumber || ""
    ).replace(/\D/g, "");

    if (!/^\d{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            error: "شماره نامعتبر است. مثال: 93721234567"
        });
    }

    if (pending.has(phoneNumber)) {
        return res.status(409).json({
            success: false,
            error: "درخواست این شماره در حال پردازش است."
        });
    }

    pending.set(phoneNumber, true);

    let sock;

    try {
        console.log("[PAIRING] Request received");

        sock = await createSession(phoneNumber);

        const code = await sock.requestPairingCode(phoneNumber);

        if (!code) {
            throw new Error("Pairing code was not generated");
        }

        console.log("[PAIRING] Code generated successfully");

        return res.status(200).json({
            success: true,
            code
        });

    } catch (error) {
        console.error("[PAIRING ERROR]", error);

        return res.status(500).json({
            success: false,
            error: "خطا در دریافت کد اتصال. لطفاً دوباره تلاش کنید."
        });

    } finally {
        pending.delete(phoneNumber);
    }
}
