import googleTTS from 'google-tts-api';

export default async function tts(sock, from, body, m, args) {
    try {
        const text = args.join(" ").trim();
        if (!text) {
            return await sock.sendMessage(from, { text: "⚠️ لطفاً متنی که می‌خواهید به ویس تبدیل شود را وارد کنید.\nمثال: !tts سلام چطوری" }, { quoted: m });
        }

        if (text.length > 200) {
            return await sock.sendMessage(from, { text: "⚠️ متن شما طولانی است. لطفاً کمتر از ۲۰۰ کاراکتر بفرستید." }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🎙️ در حال ساخت ویس..." }, { quoted: m });

        // دریافت لینک صوتی از گوگل (زبان فارسی)
        const url = googleTTS.getAudioUrl(text, {
            lang: 'fa', 
            slow: false,
            host: 'https://translate.google.com',
        });

        // دریافت فایل صوتی
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());

        // ارسال به عنوان ویس (PTT)
        await sock.sendMessage(from, {
            audio: buffer,
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: m });

    } catch (error) {
        console.log("TTS ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در ساخت ویس." }, { quoted: m });
    }
}