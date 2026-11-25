import axios from "axios";
import FormData from "form-data";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default async function upload(sock, from, body, m, args) {
    try {
        const contextInfo = m.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        
        if (!quotedMessage) {
            return await sock.sendMessage(from, { text: "📤 *Upload*\n\nReply to any media (image, video, audio, document) with !upload to get a direct link." }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "📤 Uploading your file..." }, { quoted: m });

        const buffer = await downloadMediaMessage(
            { message: quotedMessage },
            "buffer",
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const form = new FormData();
        form.append("fileToUpload", buffer, { filename: "file" });
        form.append("reqtype", "fileupload");

        const res = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders(),
            timeout: 60000
        });

        const fileUrl = res.data;

        if (!fileUrl || !fileUrl.startsWith("http")) {
            throw new Error("Invalid response from upload server.");
        }

        await sock.sendMessage(from, { 
            text: `✅ *File Uploaded!*\n\n🔗 *Link:*\n${fileUrl}` 
        }, { quoted: m });

    } catch (error) {
        console.error("UPLOAD ERROR:", error.message);
        await sock.sendMessage(from, { text: "❌ Upload failed. File may be too large (max 200MB)." }, { quoted: m });
    }
}
