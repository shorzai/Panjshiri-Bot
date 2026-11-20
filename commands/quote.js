import axios from "axios";

export default async function quote(sock, from, body, m, args) {
    try {
        // درخواست به API برای دریافت جمله تصادفی
        const response = await axios.get("https://pro-apis.zone.id/api/fun/quote", {
            params: {
                key: "freekey"
            },
            timeout: 15000
        });

        const result = response.data;

        if (!result.success || !result.data) {
            throw new Error("پاسخ معتبری از سرور دریافت نشد.");
        }

        const { quote, author, tags } = result.data;

        // فرمت‌بندی زیبا برای خروجی
        let text = `✨ *جمله امروز* ✨\n\n`;
        text += `💬 "${quote}"\n\n`;
        text += `✍️ *نویسنده:* ${author || "نامشخص"}\n`;
        
        if (tags && tags.length > 0) {
            text += `🏷️ *موضوع:* ${tags.join(", ")}\n`;
        }

        await sock.sendMessage(from, { text: text }, { quoted: m });

    } catch (error) {
        console.error("QUOTE COMMAND ERROR:", error.message);
        
        await sock.sendMessage(from, { 
            text: "❌ متأسفانه در دریافت جمله جدید خطایی رخ داد. لطفاً دوباره تلاش کنید." 
        }, { quoted: m });
    }
}
