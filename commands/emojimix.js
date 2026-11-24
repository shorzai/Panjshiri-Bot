import axios from "axios";

export default async function emojimix(sock, from, body, m, args) {
    try {
        const emoji1 = args[0];
        const emoji2 = args[1];

        if (!emoji1 || !emoji2) {
            return await sock.sendMessage(from, { text: "🧩 *Emoji Mix*\n\nمثال:\n!emojimix 😂 ❤️\n!emojimix 🐱 🌊" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🧩 در حال ترکیب ایموجی‌ها..." }, { quoted: m });

        // استفاده از API رایگان برای ترکیب ایموجی‌ها
        const url = `https://emojik.vercel.app/get?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
        
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        const buffer = Buffer.from(res.data, "binary");

        await sock.sendMessage(from, { 
            sticker: buffer 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ ترکیب این دو ایموجی ممکن نیست." }, { quoted: m });
    }
}
