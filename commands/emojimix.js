import axios from "axios";

export default async function emojimix(sock, from, body, m, args) {
    try {
        const [emoji1, emoji2] = args;
        if (!emoji1 || !emoji2) return await sock.sendMessage(from, { text: "🧩 *Emoji Mix*\n\nمثال:\n!emojimix 😂 ❤️" }, { quoted: m });

        await sock.sendMessage(from, { text: "🧩 در حال ترکیب..." }, { quoted: m });
        const url = `https://emojik.vercel.app/get?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        await sock.sendMessage(from, { sticker: Buffer.from(res.data, "binary") }, { quoted: m });
    } catch (error) {
        await sock.sendMessage(from, { text: "❌ ترکیب این دو ایموجی ممکن نیست یا سرویس موقتاً در دسترس نیست." }, { quoted: m });
    }
}
