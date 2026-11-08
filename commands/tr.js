export default async function tr(sock, from, body, m, args) {
    try {
        const targetLang = args[0] || 'fa'; // پیش‌فرض فارسی
        
        const quotedInfo = m.message?.extendedTextMessage?.contextInfo;
        if (!quotedInfo || !quotedInfo.quotedMessage) {
            return sock.sendMessage(from, { text: "📌 لطفاً روی پیامی که می‌خواهید ترجمه شود ریپلای کنید و بنویسید:\n!tr fa" }, { quoted: m });
        }

        // استخراج متن از پیام ریپلای شده
        const quotedMsg = quotedInfo.quotedMessage;
        const textToTranslate = quotedMsg.conversation || 
                                quotedMsg.extendedTextMessage?.text || 
                                quotedMsg.imageMessage?.caption;

        if (!textToTranslate) {
            return sock.sendMessage(from, { text: "❌ این پیام متنی برای ترجمه ندارد." }, { quoted: m });
        }

        await sock.sendMessage(from, { react: { text: "🌐", key: m.key } });

        // استفاده از API رایگان گوگل ترنسلیت
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        const translatedText = data[0].map(item => item[0]).join('');
        const detectedLang = data[2];

        await sock.sendMessage(from, {
            text: `🌐 *ترجمه خودکار*\n\n🔤 *زبان مبدا:* ${detectedLang}\n🎯 *زبان مقصد:* ${targetLang}\n\n💬 *متن ترجمه شده:*\n${translatedText}`
        }, { quoted: m });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { text: "❌ خطا در ترجمه." }, { quoted: m });
    }
}