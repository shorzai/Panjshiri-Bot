import axios from "axios";

export default async function advice(sock, from, body, m) {
    try {
        const res = await axios.get("https://api.adviceslip.com/advice");
        const advice = res.data?.slip?.advice;

        if (!advice) throw new Error("Empty");

        await sock.sendMessage(from, { 
            text: `💡 *توصیه امروز:*\n\n"${advice}"\n\n👑 RAEES SULTAN BOT` 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در دریافت توصیه. دوباره تلاش کنید." }, { quoted: m });
    }
}
