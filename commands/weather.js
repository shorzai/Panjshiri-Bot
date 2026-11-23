import axios from "axios";

// ========================================
// WEATHER — ZONE.ID API
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/tools/weather"\;

export default async function weather(sock, from, body, m, args) {
    try {
        const city = args?.join(" ").trim();

        // 1) Help
        if (!city || city === "help") {
            return await sock.sendMessage(from, {
                text:
                    "🌤️ *WEATHER*\n\n" +
                    "برای دیدن وضعیت آب‌وهوا:\n" +
                    "➜ .weather نام شهر\n\n" +
                    "مثال:\n" +
                    "➜ .weather Kabul\n" +
                    "➜ .weather Herat"
            }, { quoted: m });
        }

        // 2) Request
        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                city: city
            },
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 500
        });

        const result = response.data;

        // 3) API error
        if (!result?.success || !result?.data) {
            return await sock.sendMessage(from, {
                text: `❌ اطلاعات آب‌وهوا برای «${city}» پیدا نشد.\n\n` +
                      (result?.message || "لطفاً نام شهر را به انگلیسی وارد کنید.")
            }, { quoted: m });
        }

        const w = result.data;

        // 4) Safe value helper
        const val = (v, fallback = "نامشخص") =>
            v === undefined || v === null || v === "" ? fallback : v;

        // 5) Forecast block
        let forecastText = "";
        if (Array.isArray(w.forecast) && w.forecast.length > 0) {
            forecastText = "\n📅 *پیش‌بینی:*\n";
            for (const f of w.forecast) {
                forecastText +=
                    `• ${val(f.day)}: ${val(f.condition)} | ` +
                    `🔺${val(f.high)} 🔻${val(f.low)}\n`;
            }
        }

        // 6) Final text
        const text =
            `🌍 *${val(w.city)}, ${val(w.country)}*\n\n` +
            `🌡️ دما: ${val(w.temperature?.celsius)} (${val(w.temperature?.fahrenheit)})\n` +
            `☁️ وضعیت: ${val(w.condition)}\n` +
            `💧 رطوبت: ${val(w.humidity)}\n` +
            `💨 سرعت باد: ${val(w.windSpeed)}\n` +
            `☀️ شاخص UV: ${val(w.uvIndex)}\n` +
            `🏭 کیفیت هوا: ${val(w.airQuality)}\n` +
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
