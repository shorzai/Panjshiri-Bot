export default async function poll(sock, from, body, m, args) {
    try {
        // گرفتن متن کامل دستور
        const text = args.join(' ');
        
        // بررسی فرمت درست (باید با علامت | جدا شده باشد)
        if (!text || !text.includes('|')) {
            return sock.sendMessage(from, { 
                text: "📌 *روش استفاده:*\n!poll سوال | گزینه ۱ | گزینه ۲ | گزینه ۳\n\n*مثال:*\n!poll ناهار چی بخوریم؟ | پیتزا | کباب | برگر" 
            }, { quoted: m });
        }

        // جدا کردن سوال و گزینه‌ها
        const parts = text.split('|').map(p => p.trim());
        
        if (parts.length < 3) {
            return sock.sendMessage(from, { 
                text: "❌ شما باید حداقل یک سوال و دو گزینه وارد کنید." 
            }, { quoted: m });
        }

        const question = parts[0];
        const options = parts.slice(1);

        // ساخت نظرسنجی بومی واتساپ
        await sock.sendMessage(from, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1 // کاربر فقط می‌تواند ۱ گزینه را انتخاب کند
            }
        }, { quoted: m });

        // واکنش نشان دادن
        await sock.sendMessage(from, { 
            react: { text: "📊", key: m.key } 
        });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { 
            text: "❌ خطا در ساخت نظرسنجی!" 
        }, { quoted: m });
    }
}