export default async function del(sock, from, body, m, args) {
    try {
        // بررسی اینکه آیا روی پیامی ریپلای شده است یا نه
        const quotedInfo = m.message?.extendedTextMessage?.contextInfo;

        if (!quotedInfo) {
            return sock.sendMessage(from, { 
                text: "📌 لطفاً روی پیامی که می‌خواهید پاک شود ریپلای کنید و بنویسید !del" 
            }, { quoted: m });
        }

        // ۱. واکنش نشان دادن با ایموجی سطل زباله
        await sock.sendMessage(from, { 
            react: { text: "🗑️", key: m.key } 
        });

        // ۲. ساخت کلید (Key) پیام مورد نظر برای حذف
        const keyToDelete = {
            remoteJid: from,
            fromMe: false, // چون معمولاً پیام دیگران را پاک می‌کنیم
            id: quotedInfo.stanzaId,
            participant: quotedInfo.participant
        };

        // ۳. پاک کردن پیام برای همه (Delete for everyone)
        await sock.sendMessage(from, { delete: keyToDelete });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { 
            text: "❌ خطا در پاک کردن! (مطمئن شوید ربات در گروه ادمین است تا بتواند پیام دیگران را پاک کند)" 
        }, { quoted: m });
    }
}