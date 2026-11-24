import axios from "axios";

export default async function ascii(sock, from, body, m, args) {
    try {
        const text = args.join(" ").trim();
        if (!text) {
            return await sock.sendMessage(from, { text: "🔤 *ASCII Art*\n\nمثال:\n!ascii SULTAN\n!ascii HELLO" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🎨 در حال ساخت متن هنری..." }, { quoted: m });

        // استفاده از یک API رایگان برای تبدیل متن به آسکی
        const res = await axios.get(`https://api.popcat.xyz/ascii?text=${encodeURIComponent(text)}`);
        const art = res.data?.text || res.data?.ascii;

        if (!art) throw new Error("Empty");

        await sock.sendMessage(from, { 
            text: `\`\`\`\n${art}\n\`\`\`` 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در ساخت متن هنری." }, { quoted: m });
    }
}
