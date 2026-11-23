import axios from "axios";

// ========================================
// APK DOWNLOADER — AN1.COM
// ========================================

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/download/an1"\;

export default async function apk(sock, from, body, m, args) {
    try {
        const query = args?.join(" ").trim();

        // 1) Help
        if (!query) {
            return await sock.sendMessage(from, {
                text:
                    "📦 *APK DOWNLOADER*\n\n" +
                    "برای دانلود اپلیکیشن یا بازی:\n" +
                    "➜ .apk subway surfers\n" +
                    "➜ .apk whatsapp"
            }, { quoted: m });
        }

        await sock.sendMessage(from, {
            text: `🔎 در حال جستجوی *${query}* ...`
        }, { quoted: m });

        // 2) Request
        const response = await axios.get(API_URL, {
            params: {
                key: API_KEY,
                q: query,
                index: 1
            },
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 500
        });

        const result = response.data;

        // 3) API error
        if (!result?.success || !result?.data) {
            return await sock.sendMessage(from, {
                text: `❌ نتیجه‌ای برای «${query}» پیدا نشد.\n\n` +
                      (result?.message || "لطفاً نام اپلیکیشن را به انگلیسی وارد کنید.")
            }, { quoted: m });
        }

        const app = result.data;

        // 4) Safe value helper
        const val = (v, fallback = "نامشخص") =>
            v === undefined || v === null || v === "" ? fallback : v;

        // 5) Build caption
        const caption =
            `📦 *${val(app.title)}*\n\n` +
            `🏷️ نسخه: ${val(app.version)}\n` +
            `👨‍💻 توسعه‌دهنده: ${val(app.developer)}\n` +
            `📱 سیستم‌عامل: ${val(app.os)}\n` +
            `⭐ امتیاز: ${val(app.rating)}\n` +
            `💾 حجم: ${val(app.size)}\n\n` +
            `👑 *RAEES SULTAN BOT*`;

        // 6) Send preview image (if available)
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

        // 7) Send APK document (only if downloadUrl exists)
        if (!app.downloadUrl) {
            return await sock.sendMessage(from, {
                text: "❌ لینک دانلود مستقیم برای این اپلیکیشن پیدا نشد."
            }, { quoted: m });
        }

        await sock.sendMessage(from, {
            document: { url: app.downloadUrl },
            fileName: app.fileName || `${query.replace(/\s+/g, "_")}.apk`,
            mimetype: "application/vnd.android.package-archive",
            caption: `📥 ${val(app.title)}`
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
