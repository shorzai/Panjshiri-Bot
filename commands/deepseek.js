import axios from "axios";

// ========================================
// DEEPSEEK AI — DeepSeek-R1
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/ai/deepseek";

export default async function deepseek(sock, from, body, m, args) {
    try {
        const query = args?.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(from, {
                text:
                    "🧠 *DEEPSEEK AI*\n\n" +
                    "برای پرسیدن سوال:\n" +
                    "➜ .deepseek سوال خودت را بنویس"
            }, { quoted: m });
        }

        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                q: query
            },
            timeout: 60000
        });

        const result = response.data;

        if (!result?.success || !result?.data?.response) {
            return await sock.sendMessage(from, {
                text: `❌ پاسخی برای این سوال دریافت نشد.`
            }, { quoted: m });
        }

        const answer = result.data.response;

        return await sock.sendMessage(from, {
            text: `🧠 *DEEPSEEK-R1*\n\n${answer}`
        }, { quoted: m });

    } catch (error) {
        console.error("DEEPSEEK COMMAND ERROR:", error.response?.data || error.message);

        const apiError =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

        return await sock.sendMessage(from, {
            text: `❌ خطا در دریافت پاسخ:\n\n${apiError}`
        }, { quoted: m });
    }
}
