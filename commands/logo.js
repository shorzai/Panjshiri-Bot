import axios from "axios";

export default async function logo(sock, from, body, m, args) {
    try {
        const stylesList = [
            "3dsilver", "angelwing", "ballon", "circlemascot", "colorful", "cubic", 
            "foggy", "galaxy", "galaxy2", "gaming", "golden", "gradient", "hacker", 
            "jewel", "mascot", "matrix", "metal", "nigeria", "papercut", "sand", 
            "snake", "paintsplat", "star", "typography", "wgalaxy", "bagen"
        ];

        // 🚨 1. بررسی ورودی‌ها
        const style = args[0]?.toLowerCase();
        const text = args.slice(1).join(" ").trim();

        if (!style || !text) {
            return await sock.sendMessage(from, {
                text: `🎨 *Logo Maker*\n\n` +
                      `روش استفاده:\n` +
                      `!logo [استایل] [متن شما]\n\n` +
                      `📌 مثال:\n` +
                      `!logo hacker SULTAN\n` +
                      `!logo golden RAEES\n\n` +
                      `🔹 *لیست استایل‌های موجود:*\n` +
                      `\`${stylesList.join(", ")}\``
            }, { quoted: m });
        }

        if (!stylesList.includes(style)) {
            return await sock.sendMessage(from, {
                text: `❌ استایل وارد شده معتبر نیست. لطفاً از لیست زیر یک استایل انتخاب کنید:\n\n\`${stylesList.join(", ")}\``
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "⏳ در حال ساخت لوگو..." }, { quoted: m });

        // 🚨 2. تنظیم پارامترها
        const params = {
            key: "freekey"
        };

        // استایل bagen به دو متن نیاز دارد (textL و textR)
        if (style === "bagen") {
            const parts = text.split("|"); // کاربر باید با علامت | جدا کند
            if (parts.length < 2) {
                return await sock.sendMessage(from, {
                    text: "⚠️ برای استایل `bagen` باید دو متن را با علامت `|` جدا کنید.\n\nمثال:\n!logo bagen Left | Right"
                }, { quoted: m });
            }
            params.textL = parts[0].trim();
            params.textR = parts[1].trim();
        } else {
            params.text = text;
        }

        // 🚨 3. درخواست به API
        const apiUrl = `https://pro-apis.zone.id/api/tools/logo/${style}`;
        
        const response = await axios.get(apiUrl, {
            params: params,
            responseType: "arraybuffer", // دریافت عکس به صورت بافر
            timeout: 30000
        });

        // 🚨 4. ارسال عکس
        const imageBuffer = Buffer.from(response.data, "binary");

        await sock.sendMessage(from, {
            image: imageBuffer,
            caption: `✅ *لوگوی شما آماده شد!*\n\n🎨 استایل: ${style}\n📝 متن: ${text}`
        }, { quoted: m });

    } catch (error) {
        console.error("LOGO COMMAND ERROR:", error.message);
        
        await sock.sendMessage(from, { 
            text: "❌ متأسفانه در ساخت لوگو خطایی رخ داد. (ممکن است سرور API پاسخ ندهد یا متن شما شامل کاراکترهای غیرمجاز باشد)." 
        }, { quoted: m });
    }
}
