import axios from "axios";

// ========================================
// APK DOWNLOADER — AN1.COM
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/download/an1"\;

export default async function apk(sock, from, body, m, args) {
    try {
        const query = args?.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(from, {
                text:
                    "📦 *APK DOWNLOADER*\n\n" +
                    "برای دانلود اپلیکیشن یا بازی:\n" +
                    "➜ .apk subway surfers"
            }, { quoted: m });
        }

        await sock.sendMessage(from, {
            text: `🔎 در حال جستجوی *${query}* ...`
        }, { quoted: m });

        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                q: query,
                index: 1
            },
            timeout: 30000
        });

        const result = response.data;

        if (!result?.success || !result?.data) {
            return await sock.sendMessage(from, {
                text: `❌ نتیجه‌ای برای «${query}» پیدا نشد.`
            }, { quoted: m });
        }

        const app = result.data;

        const caption =
            `📦 *${app.title}*\n\n` +
            `🏷️ نسخه: ${app.version}\n` +
            `👨‍💻 توسعه‌دهنده: ${app.developer}\n` +
            `📱 سیستم‌عامل: ${app.os}\n` +
            `⭐ امتیاز: ${app.rating}\n` +
            `💾 حجم: ${app.size}\n\n` +
            `👑 *RAEES SULTAN BOT*`;

        // ارسال تصویر معرفی برنامه
        if (app.imageUrl) {
            try {
                await sock.sendMessage(from, {
                    image: { url: app.imageUrl },
                    caption
                }, { quoted: m });
            } catch (imgErr) {
                console.log("APK IMAGE ERROR:", imgErr.message);
                await sock.sendMessage(from, { text: caption }, { quoted: m });
            }
        } else {
            await sock.sendMessage(from, { text: caption }, { quoted: m });
        }

        // ارسال فایل APK
        await sock.sendMessage(from, {
            document: { url: app.downloadUrl },
            fileName: app.fileName || `${query.replace(/\s+/g, "_")}.apk`,
            mimetype: "application/vnd.android.package-archive",
            caption: `📥 ${app.title}`
        }, { quoted: m });

    } catch (error) {
        console.error("APK COMMAND ERROR:", error.response?.data || error.message);

        const apiError =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

        return await sock.sendMessage(from, {
            text: `❌ خطا در دریافت اپلیکیشن:\n\n${apiError}`
        }, { quoted: m });
    }
}
