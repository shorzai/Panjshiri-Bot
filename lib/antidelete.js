import { downloadMediaMessage } from "@whiskeysockets/baileys";
import chalk from "chalk";

// کش برای نگهداری موقت پیام‌ها (حداکثر ۵۰۰ پیام برای جلوگیری از پر شدن رم)
const msgCache = new Map();
const MAX_CACHE_SIZE = 500;

export default function antidelete(sock) {
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        
        for (const m of messages) {
            if (!m?.message || !m?.key?.id) continue;

            // 🚨 1. ذخیره پیام‌ها در کش
            if (!m.message.protocolMessage) {
                msgCache.set(m.key.id, m);
                
                // پاک کردن قدیمی‌ترین پیام‌ها اگر از سقف رد شد
                if (msgCache.size > MAX_CACHE_SIZE) {
                    const firstKey = msgCache.keys().next().value;
                    msgCache.delete(firstKey);
                }
            }

            // 🚨 2. تشخیص رویداد حذف پیام (Revoke)
            const protocolMsg = m.message.protocolMessage;
            if (protocolMsg && protocolMsg.type === 0) { 
                const revokedId = protocolMsg.key.id;
                const originalMsg = msgCache.get(revokedId);

                if (!originalMsg) continue; // اگر پیام اصلی در کش نبود، رد شو

                try {
                    // گرفتن آیدی صاحب ربات (همون شماره‌ای که ربات بهش وصله)
                    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                    
                    // پیدا کردن فرستنده اصلی پیام
                    const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                    
                    // تشخیص اینکه پیام توی گروه بوده یا چت خصوصی
                    const isGroup = originalMsg.key.remoteJid.endsWith("@g.us");
                    const chatType = isGroup ? "گروه 🏘️" : "خصوصی 👤";

                    // گرفتن متن پیام (اگر مدیا باشه، کپشنش رو میگیره)
                    const content = originalMsg.message;
                    const text = 
                        content.conversation || 
                        content.extendedTextMessage?.text || 
                        content.imageMessage?.caption || 
                        content.videoMessage?.caption || 
                        "پیام مدیا (بدون متن)";

                    let caption = `🚨 *پیام حذف شده کشف شد!*\n\n` +
                                  `👤 *فرستنده:* @${sender.split('@')[0]}\n` +
                                  `📍 *چت:* ${chatType}\n\n` +
                                  `💬 *محتوا:* \n${text}`;

                    // 🚨 3. بررسی نوع مدیا و ارسال برای صاحب ربات
                    if (content.imageMessage) {
                        const buffer = await downloadMediaMessage(originalMsg, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                        await sock.sendMessage(botJid, { image: buffer, caption, mentions: [sender] });
                    } 
                    else if (content.videoMessage) {
                        const buffer = await downloadMediaMessage(originalMsg, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                        await sock.sendMessage(botJid, { video: buffer, caption, mentions: [sender] });
                    } 
                    else if (content.stickerMessage) {
                        const buffer = await downloadMediaMessage(originalMsg, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                        await sock.sendMessage(botJid, { sticker: buffer });
                        await sock.sendMessage(botJid, { text: caption, mentions: [sender] });
                    }
                    else {
                        await sock.sendMessage(botJid, { text: caption, mentions: [sender] });
                    }

                    console.log(chalk.green(`✅ AntiDelete captured a ${chatType} message from ${sender}`));

                } catch (err) {
                    console.error("❌ ANTIDELETE ERROR:", err.message);
                }
            }
        }
    });
}
