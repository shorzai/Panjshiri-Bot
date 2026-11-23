import axios from "axios";

export default async function crypto(sock, from, body, m, args) {
    const coin = args[0]?.toLowerCase();
    if (!coin) return await sock.sendMessage(from, { text: "🪙 *Crypto Prices*\n\nمثال:\n!crypto btc\n!crypto eth" }, { quoted: m });

    const map = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", bnb: "binancecoin" };
    const id = map[coin] || coin;

    try {
        await sock.sendMessage(from, { text: "⏳ در حال دریافت قیمت..." }, { quoted: m });
        const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,irr`, { timeout: 15000 });
        const data = res.data[id];
        if (!data) throw new Error("Not found");

        const text = `🪙 *${id.toUpperCase()}*\n\n💵 قیمت: $${data.usd.toLocaleString()}\n🇮🇷 تومان: ${(data.irr / 10).toLocaleString()}`;
        await sock.sendMessage(from, { text }, { quoted: m });
    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در دریافت قیمت. (ممکن است درخواست‌ها زیاد شده باشد، لطفاً چند لحظه بعد دوباره تلاش کنید.)" }, { quoted: m });
    }
}
