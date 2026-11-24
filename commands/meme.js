import axios from "axios";

export default async function meme(sock, from, body, m) {
    try {
        await sock.sendMessage(from, { text: "😂 در حال آوردن یک میم باحال..." }, { quoted: m });
        
        const res = await axios.get("https://meme-api.com/gimme");
        const data = res.data;

        if (!data?.url) throw new Error("No image found");

        const caption = `😂 *${data.title}*\n\n👤 ساب‌ردیت: r/${data.subreddit}\n⬆️ آپ‌وت: ${data.ups}`;

        await sock.sendMessage(from, { 
            image: { url: data.url }, 
            caption 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در دریافت میم. لطفاً دوباره تلاش کنید." }, { quoted: m });
    }
}
