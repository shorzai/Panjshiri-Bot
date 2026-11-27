import { downloadMediaMessage } from "@whiskeysockets/baileys";
import Jimp from "jimp";

export default async function imgfilter(sock, from, body, m, args) {
    try {
        const effect = args[0]?.toLowerCase() || "blur";
        const contextInfo = m.message?.extendedTextMessage?.contextInfo;
        const imageMessage = contextInfo?.quotedMessage?.imageMessage;

        if (!imageMessage) {
            return await sock.sendMessage(from, { text: "🖼️ *Image Filter*\n\nReply to an image with:\n!imgfilter [blur, gray, invert, sepia, flip]" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `🎨 Applying ${effect} filter...` }, { quoted: m });

        const buffer = await downloadMediaMessage(
            { message: { imageMessage } },
            "buffer",
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const image = await Jimp.read(buffer);

        switch (effect) {
            case "gray":
            case "خاکستری":
                image.grayscale();
                break;
            case "blur":
            case "تار":
                image.blur(15);
                break;
            case "invert":
            case "معکوس":
                image.invert();
                break;
            case "sepia":
            case "قدیمی":
                image.sepia();
                break;
            case "flip":
            case "آینه":
                image.flip(true, false);
                break;
            default:
                return await sock.sendMessage(from, { text: "❌ Invalid effect. Use: blur, gray, invert, sepia, flip" }, { quoted: m });
        }

        const finalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

        await sock.sendMessage(from, { 
            image: finalBuffer, 
            caption: `✅ Filter applied: *${effect}*` 
        }, { quoted: m });

    } catch (error) {
        console.error("FILTER ERROR:", error.message);
        await sock.sendMessage(from, { text: "❌ Error processing image." }, { quoted: m });
    }
}
