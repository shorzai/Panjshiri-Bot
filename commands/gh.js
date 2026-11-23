import axios from "axios";

export default async function gh(sock, from, body, m, args) {
    const user = args[0];
    
    if (!user) {
        return await sock.sendMessage(from, { 
            text: "🐙 *GitHub Info*\n\nمثال:\n!gh torvalds\n!gh shorzai" 
        }, { quoted: m });
    }

    try {
        await sock.sendMessage(from, { text: "🔎 در حال دریافت اطلاعات..." }, { quoted: m });

        const res = await axios.get(`https://api.github.com/users/${user}`);
        const d = res.data;

        const text = `🐙 *GitHub: ${d.login}*\n\n` +
                     `👤 نام: ${d.name || "ندارد"}\n` +
                     `📝 بیو: ${d.bio || "ندارد"}\n` +
                     `👥 فالوور: ${d.followers}\n` +
                     `📦 ریپازیتوری: ${d.public_repos}\n` +
                     `📍 لوکیشن: ${d.location || "نامشخص"}\n\n` +
                     `🔗 ${d.html_url}`;

        await sock.sendMessage(from, { 
            image: { url: d.avatar_url }, 
            caption: text 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ کاربری با این نام در گیت‌هاب پیدا نشد." }, { quoted: m });
    }
}
