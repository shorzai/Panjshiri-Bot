import axios from "axios";

export default async function crypto(sock, from, body, m, args) {
    const coin = args[0]?.toLowerCase();
    
    if (!coin) {
        return await sock.sendMessage(from, { 
            text: "🪙 *Crypto Prices*\n\nمثال:\n!crypto btc\n!crypto eth\n!crypto doge" 
        }, { quoted: m });
    }

    // تبدیل اسم‌های رایج به اسم‌های رسمی API
    const map = { 
        btc: "bitcoin", eth: "ethereum", sol: "solana", 
        doge: "dogecoin", bnb: "binancecoin", ada: "cardano", xrp: "ripple" 
    };
    const id = map[coin] || coin;

    try {
        await sock.sendMessage(from, { text: "⏳ در حال دریافت قیمت..." }, { quoted: m });
        
        const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,irr`);
        const data = res.data[id];
        
        if (!data) throw new Error("Not found");

        const text = `🪙 *${id.toUpperCase()}*\n\n` +
                     `💵 قیمت دلاری: $${data.usd.toLocaleString()}\n` +
                     `🇮🇷 قیمت تومانی: ${(data.irr / 10).toLocaleString()} تومان`;
                     
        await sock.sendMessage(from, { text }, { quoted: m });
    } catch (error) {
        await sock.sendMessage(from, { text: "❌ ارز مورد نظر پیدا نشد یا خطایی رخ داد." }, { quoted: m });
    }
}
