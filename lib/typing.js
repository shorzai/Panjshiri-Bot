import config from "../config.js";

export default function typing(sock) {
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            // چک کردن اینکه سیستم تایپینگ توی کانفیگ روشن باشه
            if (!config.TYPING) return;

            const m = chatUpdate.messages[0];
            if (!m?.message || m.key.fromMe) return;

            const from = m.key.remoteJid;

            // 🚨 نادیده گرفتن کانال‌ها، استاتوس و پیام‌های سیستمی (جلوگیری از خطای jidDecode)
            if (
                !from || 
                from === "status@broadcast" || 
                from.endsWith("@newsletter") || 
                from.endsWith("@broadcast")
            ) {
                return;
            }

            // ارسال سیگنال "در حال تایپ..." به صورت استاندارد
            await sock.sendPresenceUpdate("composing", from);

            // محاسبه زمان تایپ بر اساس طول پیام (پیش‌فرض ۱ ثانیه، حداکثر ۳ ثانیه)
            const textLength = m.message.conversation?.length || m.message.extendedTextMessage?.text?.length || 10;
            const baseTime = config.TYPING_TIME || 1000;
            const typingDuration = Math.min(baseTime + (textLength * 20), 3000);

            // بعد از زمان مشخص شده، سیگنال تایپ رو متوقف میکنیم
            setTimeout(async () => {
                try {
                    await sock.sendPresenceUpdate("paused", from);
                } catch (e) {}
            }, typingDuration);

        } catch (e) {
            // هر خطایی رخ بده، فقط لاگ میشه و برنامه کرش نمیکنه
            console.error("TYPING ERROR:", e.message);
        }
    });
}
