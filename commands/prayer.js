import axios from "axios";

export default async function prayer(sock, from, body, m, args) {
    try {
        const city = args.join(" ").trim();
        if (!city) {
            return await sock.sendMessage(from, { text: "🕌 *Prayer Times*\n\nExample:\n!prayer Kabul\n!prayer Herat" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🕌 Fetching prayer times..." }, { quoted: m });

        const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=1`, { timeout: 15000 });
        const data = res.data.data;

        if (!data) throw new Error("City not found.");

        const timings = data.timings;
        const date = data.date.readable;

        const text = `🕌 *Prayer Times for ${city}*\n📅 ${date}\n\n` +
                     `🌅 Fajr: ${timings.Fajr}\n` +
                     `🌄 Sunrise: ${timings.Sunrise}\n` +
                     `☀️ Dhuhr: ${timings.Dhuhr}\n` +
                     `🌤️ Asr: ${timings.Asr}\n` +
                     `🌇 Maghrib: ${timings.Maghrib}\n` +
                     `🌙 Isha: ${timings.Isha}\n\n` +
                     `👑 RAEES SULTAN BOT`;

        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ City not found or API error." }, { quoted: m });
    }
}
