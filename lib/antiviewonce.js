import { downloadMediaMessage } from "@whiskeysockets/baileys";
import chalk from "chalk";

export default function antiviewonce(sock) {
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const m = messages[0];
        if (!m?.message) return;

        // 🚨 1. بررسی اینکه آیا پیام از نوع View Once هست یا نه
        const viewOnce = m.message.viewOnceMessageV2 || m.message.viewOnceMessage;
        if (!viewOnce) return;

        const innerMessage = viewOnce.message;
        if (!innerMessage) return;

        const isImage = !!innerMessage.imageMessage;
        const isVideo = !!innerMessage.videoMessage;

        if (!isImage && !isVideo) return;

        try {
            // 🚨 2. دانلود مدیا
            const buffer = await downloadMediaMessage(
                m,
                "buffer",
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer || buffer.length === 0) return;

            // 🚨 3. پیدا کردن شماره صاحب ربات (همون شماره‌ای که ربات بهش وصله)
            const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            
            // پیدا کردن فرستنده اصلی
            const sender = m.key.participant || m.key.remoteJid;
            const typeText = isImage ? "تصویر 📷" : "ویدیو 🎬";
            
            const caption = `🔓 *View Once Intercepted!*\n\n` +
                            `👤 *فرستنده:* @${sender.split('@')[0]}\n` +
                            `📦 *نوع:* ${typeText}\n` +
                            `📍 *چت:* ${m.key.remoteJid.endsWith("@g.us") ? "گروه" : "خصوصی"}`;

            // 🚨 4. ارسال برای صاحب ربات
            if (isImage) {
                await sock.sendMessage(botJid, { 
                    image: buffer, 
                    caption, 
                    mentions: [sender] 
                });
            } else {
                await sock.sendMessage(botJid, { 
                    video: buffer, 
                    caption, 
                    mentions: [sender] 
                });
            }

            console.log(chalk.green(`✅ View Once Intercepted from ${sender}`));

        } catch (error) {
            console.error(chalk.red("❌ ANTIVIEWONCE ERROR:"), error.message);
        }
    });
}
