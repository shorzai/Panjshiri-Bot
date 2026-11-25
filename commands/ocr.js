import axios from "axios";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import FormData from "form-data";

export default async function ocr(sock, from, body, m, args) {
    try {
        const contextInfo = m.message?.extendedTextMessage?.contextInfo;
        const imageMessage = contextInfo?.quotedMessage?.imageMessage;

        if (!imageMessage) {
            return await sock.sendMessage(from, { text: "📸 Please reply to an image with !ocr to extract text." }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🔎 Extracting text from image..." }, { quoted: m });

        const buffer = await downloadMediaMessage(
            { message: { imageMessage } },
            "buffer",
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const form = new FormData();
        form.append("apikey", "helloworld");
        form.append("language", "eng");
        form.append("file", buffer, { filename: "image.jpg" });

        const res = await axios.post("https://api.ocr.space/parse/image", form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        const result = res.data;
        if (!result.ParsedResults || result.ParsedResults.length === 0) {
            throw new Error("No text found.");
        }

        const extractedText = result.ParsedResults[0].ParsedText;
        if (!extractedText || extractedText.trim() === "") {
            throw new Error("Image seems to be empty or unreadable.");
        }

        await sock.sendMessage(from, { text: `📝 *Extracted Text:*\n\n${extractedText}` }, { quoted: m });

    } catch (error) {
        console.error("OCR ERROR:", error.message);
        await sock.sendMessage(from, { text: "❌ Failed to extract text. Please try a clearer image." }, { quoted: m });
    }
}
