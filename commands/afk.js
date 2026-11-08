// اگر ربات ری‌استارت شود این نقشه پاک می‌شود (برای ذخیره دائم باید به دیتابیس وصل شود)
global.afkUsers = global.afkUsers || new Map();

export default async function afk(sock, from, body, m, args) {
    try {
        const sender = m.key.participant || m.key.remoteJid;
        const reason = args.join(' ') || 'بدون دلیل';

        if (global.afkUsers.has(sender)) {
            // اگر قبلاً AFK بود، حذفش می‌کنیم (برگشت)
            global.afkUsers.delete(sender);
            await sock.sendMessage(from, { text: "👋 خوش برگشتی! وضعیت AFK شما حذف شد." }, { quoted: m });
        } else {
            // ثبت AFK جدید
            global.afkUsers.set(sender, reason);
            await sock.sendMessage(from, { 
                text: `💤 *وضعیت AFK ثبت شد.*\n📝 دلیل: ${reason}` 
            }, { quoted: m });
        }

        await sock.sendMessage(from, { react: { text: "💤", key: m.key } });

    } catch (e) {
        console.log(e);
    }
}