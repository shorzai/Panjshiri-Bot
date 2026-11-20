import axios from "axios";

// ========================================
// WEATHER — ZONE.ID API
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/tools/weather"\;

export default async function weather(sock, from, body, m, args) {
    try {
        const city = args?.join(" ").trim();

        if (!city) {
            return await sock.sendMessage(from, {
                text:
                    "🌤️ *WEATHER*\n\n" +
                    "برای دیدن وضعیت آب‌وهوا:\n" +
                    "➜ .weather نام شهر\n\n" +
                    "مثال:\n" +
                    "➜ .weather Kabul"
            }, { quoted: m });
        }

        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                city: city
            },
            timeout: 30000
        });

        const result = response.data;

        if (!result?.success || !result?.data) {
            return await sock.sendMessage(from, {
                text: `❌ اطلاعات آب‌وهوا برای «${city}» پیدا نشد.`
            }, { quoted: m });
        }

        const w = result.data;

        let forecastText = "";
        if (Array.isArray(w.forecast) && w.forecast.length > 0) {
            forecastText = "\n📅 *پیش‌بینی:*\n";
            for (const f of w.forecast) {
                forecastText += `• ${f.day}: ${f.condition} | 🔺${f.high} 🔻${f.low}\n`;
            }
        }

        const text =
            `🌍 *${w.city}, ${w.country}*\n\n` +
            `🌡️ دما: ${w.temperature?.celsius} (${w.temperature?.fahrenheit})\n` +
            `☁️ وضعیت: ${w.condition}\n` +
            `💧 رطوبت: ${w.humidity}\n` +
            `💨 سرعت باد: ${w.windSpeed}\n` +
            `☀️ شاخص UV: ${w.uvIndex}\n` +
            `🏭 کیفیت هوا: ${w.airQuality}\n` +
            forecastText +
            `\n👑 *RAEES SULTAN BOT*`;

        return await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.error("WEATHER COMMAND ERROR:", error.response?.data || error.message);

        const apiError =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

        return await sock.sendMessage(from, {
            text: `❌ خطا در دریافت آب‌وهوا:\n\n${apiError}`
        }, { quoted: m });
    }
}
