import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import Pino from "pino";
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

        // استفاده از یک پوشه موقت برای گرفتن کد (بدون دیتابیس)
        const tempDir = `./temp_session_${phoneNumber}`;
        const { state, saveCreds } = await useMultiFileAuthState(tempDir);

        const sock = makeWASocket({
            auth: state,
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            mobile: phoneNumber
        });

        sock.ev.on("creds.update", saveCreds);

        // درخواست کد بلافاصله
        const code = await sock.requestPairingCode(phoneNumber);

        if (!code) {
            throw new Error("کد دریافت نشد.");
        }

        console.log(`[API] Code generated instantly: ${code}`);
        return res.json({ success: true, code });

    } catch (error) {
        console.error("Pairing error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
