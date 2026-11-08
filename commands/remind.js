export default async function remind(sock, from, body, m, args) {
    try {
        const timeArg = args[0];
        const reminderText = args.slice(1).join(' ');

        if (!timeArg || !reminderText) {
            return sock.sendMessage(from, { text: "📌 روش استفاده:\n!remind 10m جلسه دارم\n(زمان‌ها: s=ثانیه, m=دقیقه, h=ساعت)" }, { quoted: m });
        }

        // تبدیل زمان به میلی‌ثانیه
        const value = parseInt(timeArg);
        const unit = timeArg.slice(-1).toLowerCase();
        let ms = 0;

        if (unit === 's') ms = value * 1000;
        else if (unit === 'm') ms = value * 60 * 1000;
        else if (unit === 'h') ms = value * 60 * 60 * 1000;
        else return sock.sendMessage(from, { text: "❌ فرمت زمان اشتباه است! (مثال: 10m)" }, { quoted: m });

        if (ms > 24 * 60 * 60 * 1000) return sock.sendMessage(from, { text: "❌ حداکثر زمان ۲۴ ساعت است." }, { quoted: m });

        const sender = m.key.participant || m.key.remoteJid;

        await sock.sendMessage(from, { 
            text: `✅ *یادآور تنظیم شد!*\n⏱️ زمان: ${timeArg}\n📝 متن: ${reminderText}\n\n_در زمان مقرر به شما اطلاع می‌دهم._` 
        }, { quoted: m });

        await sock.sendMessage(from, { react: { text: "⏰", key: m.key } });

        // تنظیم تایمر
        setTimeout(async () => {
            await sock.sendMessage(from, {
                text: `🔔 *یادآوری!*\n\n👤 @${sender.split('@')[0]}\n📝 ${reminderText}`,
                mentions: [sender]
            });
        }, ms);

    } catch (e) {
        console.log(e);
    }
}