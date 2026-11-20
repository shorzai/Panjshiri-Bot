import axios from "axios";

export default async function gpt(sock, from, body, m, args) {
    try {
        // 🚨 1. گرفتن متن سوال از دستور
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(from, {
                text: "🤖 *GPT Assistant*\n\nلطفاً سوال خود را وارد کنید.\n\nمثال:\n!gpt یک شعر درباره دریا بنویس"
            }, { quoted: m });
        }

        // 🚨 2. محدودیت طول سوال (برای جلوگیری از خطای API)
        if (query.length > 1000) {
            return await sock.sendMessage(from, {
                text: "⚠️ سوال شما بسیار طولانی است. لطفاً کوتاه‌تر بپرسید."
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🤖 در حال پردازش سوال شما..." }, { quoted: m });

        // 🚨 3. ارسال درخواست به API
        const response = await axios.get("https://pro-apis.zone.id/api/ai/gpt", {
            params: {
                key: "freekey",
                q: query
            },
            timeout: 60000 // ۶۰ ثانیه تایم‌اوت برای پاسخ‌های طولانی
        });

        const result = response.data;

        // 🚨 4. بررسی پاسخ
        if (!result.success || !result.data?.response) {
            throw new Error("پاسخ معتبری از سرور دریافت نشد.");
        }

        const answer = result.data.response;

        // 🚨 5. ارسال پاسخ به کاربر
        await sock.sendMessage(from, {
            text: `🤖 *GPT Answer:*\n\n${answer}`
        }, { quoted: m });

    } catch (error) {
        console.error("GPT COMMAND ERROR:", error.message);
        
        // مدیریت خطاهای احتمالی API
        const errorMessage = error.response?.data?.error || error.message;
        
        await sock.sendMessage(from, { 
            text: `❌ متأسفانه در دریافت پاسخ خطایی رخ داد.\n\n📌 دلیل: ${errorMessage}` 
        }, { quoted: m });
    }
}
