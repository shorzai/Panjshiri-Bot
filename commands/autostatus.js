import fs from "fs";
import path from "path";

// ========================================
// AUTO STATUS VIEWER — بازدید خودکار استوری مخاطبان
// ========================================

const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "autostatus.json");

// ========================================
// خواندن / ساخت فایل تنظیمات (به‌ازای هر سشن/شماره)
// ========================================

function loadConfig() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = { sessions: {} };

            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

        return {
            sessions: {},
            ...data
        };

    } catch (error) {
        console.error("AUTOSTATUS CONFIG ERROR:", error);
        return { sessions: {} };
    }
}

// ========================================
// ذخیره تنظیمات
// ========================================

function saveConfig(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("AUTOSTATUS SAVE ERROR:", error);
    }
}

function getSessionId(sock) {
    return sock?.sessionId || sock?.user?.id || "default";
}

// ========================================
// دستور .autostatus on / off / status
// ========================================

export default async function autostatus(sock, from, body, m, args) {
    try {
        const action = args?.[0]?.toLowerCase();

        if (!["on", "off", "status"].includes(action)) {
            return await sock.sendMessage(from, {
                text:
                    "👁️ *AUTO STATUS VIEWER*\n\n" +
                    "این قابلیت استوری‌های مخاطبانت را به‌صورت خودکار برایت بازدید می‌کند.\n\n" +
                    "برای فعال کردن:\n" +
                    "➜ .autostatus on\n\n" +
                    "برای خاموش کردن:\n" +
                    "➜ .autostatus off\n\n" +
                    "برای دیدن وضعیت:\n" +
                    "➜ .autostatus status"
            }, { quoted: m });
        }

        const sessionId = getSessionId(sock);
        const config = loadConfig();

        // ------------------------------------
        // STATUS
        // ------------------------------------

        if (action === "status") {
            const enabled = config.sessions?.[sessionId] === true;

            return await sock.sendMessage(from, {
                text:
                    enabled
                        ? "🟢 AUTO STATUS VIEWER روشن است (فقط برای همین شماره)."
                        : "🔴 AUTO STATUS VIEWER خاموش است (فقط برای همین شماره)."
            }, { quoted: m });
        }

        // ------------------------------------
        // ON
        // ------------------------------------

        if (action === "on") {
            config.sessions[sessionId] = true;
            saveConfig(config);

            return await sock.sendMessage(from, {
                text:
                    "🟢 *AUTO STATUS VIEWER فعال شد!* (فقط برای همین شماره)\n\n" +
                    "از حالا استوری‌های مخاطبانت را خودکار می‌بینم. 👁️"
            }, { quoted: m });
        }

        // ------------------------------------
        // OFF
        // ------------------------------------

        if (action === "off") {
            config.sessions[sessionId] = false;
            saveConfig(config);

            return await sock.sendMessage(from, {
                text:
                    "🔴 *AUTO STATUS VIEWER خاموش شد!* (فقط برای همین شماره)\n\n" +
                    "دیگر استوری‌ها را خودکار نمی‌بینم."
            }, { quoted: m });
        }

    } catch (error) {
        console.error("AUTOSTATUS COMMAND ERROR:", error);

        return await sock.sendMessage(from, {
            text: "❌ خطا در اجرای AUTOSTATUS."
        }, { quoted: m });
    }
}

// ========================================
// بررسی روشن بودن AUTOSTATUS برای یک سشن/شماره
// ========================================

function isAutoStatusEnabled(sessionId) {
    const config = loadConfig();
    return config.sessions?.[sessionId] === true;
}

// ========================================
// بازدید خودکار استوری (وقتی پیامی از status@broadcast می‌رسد)
// ========================================

export async function handleAutoStatus(sock, message, sessionId) {
    try {
        if (!isAutoStatusEnabled(sessionId)) {
            return;
        }

        if (!message?.key) {
            return;
        }

        // پیام خودِ ربات را نادیده بگیر
        if (message.key.fromMe) {
            return;
        }

        await sock.readMessages([message.key]);

        console.log(
            `👁️ AUTOSTATUS VIEWED [${sessionId}]: ${message.key.participant || message.key.remoteJid}`
        );

    } catch (error) {
        console.error("❌ AUTOSTATUS VIEW ERROR:", error.message);
    }
}
