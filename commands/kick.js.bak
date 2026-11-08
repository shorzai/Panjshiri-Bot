export default async function kick(sock, from, body, m, args) {
    try {
        // ۱. پیدا کردن آیدی فردی که روی پیامش ریپلای شده است
        const quotedInfo = m.message?.extendedTextMessage?.contextInfo || 
                           m.message?.imageMessage?.contextInfo || 
                           m.message?.videoMessage?.contextInfo || 
                           m.message?.documentMessage?.contextInfo;

        let targetJid = quotedInfo?.participant;

        // (اختیاری) اگر ریپلای نکرده بود، از شماره تایپ شده استفاده کند
        if (!targetJid && args[0]) {
            const number = args[0].replace(/\D/g, "");
            targetJid = number + "@s.whatsapp.net";
        }

        // اگر نه ریپلای بود و نه شماره، پیام خطا بدهد
        if (!targetJid) {
            return sock.sendMessage(from, { 
                text: "📌 لطفاً روی پیام شخصی که می‌خواهید اخراج شود ریپلای کنید و بنویسید !kick\nیا شماره را وارد کنید: !kick 9379xxxx" 
            }, { quoted: m });
        }

        // جلوگیری از اخراج شدن خود ربات
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (targetJid === botId) {
            return sock.sendMessage(from, { text: "❌ من نمی‌توانم خودم را اخراج کنم!" }, { quoted: m });
        }

        // ۲. واکنش نشان دادن به پیام شما (با ایموجی چکش یا لگد)
        await sock.sendMessage(from, {
            react: {
                text: "👢", // ایموجی لگد (می‌توانید به "✔️" یا "🚫" تغییر دهید)
                key: m.key
            }
        });

        // ۳. اخراج فرد از گروه
        await sock.groupParticipantsUpdate(from, [targetJid], "remove");

        // ۴. ارسال پیام موفقیت‌آمیز
        await sock.sendMessage(from, { 
            text: "✔️ کاربر با موفقیت از گروه اخراج شد." 
        }, { quoted: m });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { 
            text: "❌ خطا در اخراج! (مطمئن شوید ربات در گروه ادمین است و دسترسی حذف اعضا را دارد)" 
        }, { quoted: m);
    }
}