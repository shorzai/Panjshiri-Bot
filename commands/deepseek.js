import axios from "axios";

// ========================================
// DEEPSEEK AI — DeepSeek-R1
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/ai/deepseek"\;

export default async function deepseek(sock, from, body, m, args) {
    try {
        const query = args?.join(" ").trim();

        // 1. راهنما در صورت خالی بودن
        if (!query) {
            return await sock.sendMessage(from, {
                text:
                    "🧠 *DEEPSEEK AI*\n\n" +
                    "برای پرسیدن سوال:\n" +
                    "➜ .deepseek سوال خودت را بنویس"
            }, { quoted: m });
        }

        // 2. بررسی طولانی نبودن سوال (برای جلوگیری از خطای API)
        if (query.length > 1000) {
            return await sock.sendMessage(from, {
                text: "⚠️ سوال شما بسیار طولانی است. لطفاً آن را کوتاه‌تر کنید."
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🧠 در حال فکر کردن..." }, { quoted: m });

        // 3. ارسال درخواست به API
        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                q: query
            },
            timeout: 60000, // ۶۰ ثانیه زمان برای پردازش مدل‌های سنگین
            validateStatus: status => status >= 200 && status < 500
        });

        const result = response.data;

        // 4. بررسی پاسخ
        if (!result?.success || !result?.data?.response) {
            return await sock.sendMessage(from, {
                text: `❌ پاسخی برای این سوال دریافت نشد.\n\n📌 دلیل: ${result?.message || "خطای نامشخص از سمت سرور"}`
            }, { quoted: m });
        }

        const answer = result.data.response;

        // 5. ارسال پاسخ به کاربر
        return await sock.sendMessage(from, {
            text: `🧠 *DEEPSEEK-R1*\n\n${answer}`
        }, { quoted: m });

    } catch (error) {
        console.error("DEEPSEEK COMMAND ERROR:", error.response?.data || error.message);

        // استخراج پیام خطای دقیق
        const apiError =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

        return await sock.sendMessage(from, {
            text: `❌ خطا در دریافت پاسخ از دیپ‌سیک:\n\n${apiError}`
        }, { quoted: m });
    }
}
