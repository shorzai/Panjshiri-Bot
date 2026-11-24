import axios from "axios";
import fs from "fs";
import path from "path";

// ========================================
// PGR AI — INCEPTION LABS
// Model: mercury-2
// ========================================

// 🔴 کلید API خودت را اینجا بگذار
const API_KEY = "";

const API_URL = "https://api.inceptionlabs.ai/v1/chat/completions";

const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "pgrai.json");

// ========================================
// ساخت فایل تنظیمات (حالا به‌ازای هر سشن/شماره جداگانه است)
// ========================================

function loadConfig() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = { sessions: {} };

            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(defaultData, null, 2)
            );

            return defaultData;
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return {
            sessions: {},
            ...data
        };

    } catch (error) {
        console.error("PGRAI CONFIG ERROR:", error);
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

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2)
        );

    } catch (error) {
        console.error("PGRAI SAVE ERROR:", error);
    }
}

// ========================================
// گرفتن (یا ساختن) تنظیمات مخصوص یک سشن/شماره
// ========================================

function getSessionConfig(config, sessionId) {
    if (!config.sessions[sessionId]) {
        config.sessions[sessionId] = {
            global: false,
            groups: {}
        };
    }

    return config.sessions[sessionId];
}

function getSessionId(sock) {
    return sock?.sessionId || sock?.user?.id || "default";
}

// ========================================
// بررسی ادمین
// ========================================

async function isAdmin(sock, from, m) {
    try {
        if (!from.endsWith("@g.us")) {
            return true;
        }

        const metadata = await sock.groupMetadata(from);

        const sender =
            m?.key?.participant ||
            m?.participant ||
            "";

        const botJid = sock?.user?.id || "";

        const normalize = jid =>
            jid?.split(":")[0]?.split("@")[0];

        const senderNumber = normalize(sender);
        const botNumber = normalize(botJid);

        // خود ربات
        if (senderNumber && senderNumber === botNumber) {
            return true;
        }

        const participant = metadata.participants?.find(p => {
            return normalize(p.id) === senderNumber;
        });

        return (
            participant?.admin === "admin" ||
            participant?.admin === "superadmin"
        );

    } catch (error) {
        console.error("PGRAI ADMIN CHECK ERROR:", error);
        return false;
    }
}

// ========================================
// گرفتن متن پیام
// ========================================

function getMessageText(m) {
    return (
        m?.message?.conversation ||
        m?.message?.extendedTextMessage?.text ||
        m?.message?.imageMessage?.caption ||
        m?.message?.videoMessage?.caption ||
        ""
    ).trim();
}

// ========================================
// دستور !pgrai on / off / status
// ========================================

export default async function pgrai(sock, from, body, m, args) {
    try {
        const action = args?.[0]?.toLowerCase();

        // فقط on/off/status
        if (!["on", "off", "status"].includes(action)) {
            return await sock.sendMessage(from, {
                text:
                    "🤖 *PGRAI*\n\n" +
                    "برای فعال کردن:\n" +
                    "➜ .pgrai on\n\n" +
                    "برای خاموش کردن:\n" +
                    "➜ .pgrai off\n\n" +
                    "برای دیدن وضعیت:\n" +
                    "➜ .pgrai status"
            });
        }

        // ------------------------------------
        // بررسی دسترسی
        // ------------------------------------

        const admin = await isAdmin(sock, from, m);

        if (!admin) {
            return await sock.sendMessage(from, {
                text: "❌ فقط ادمین گروه می‌تواند PGRAI را تغییر دهد."
            });
        }

        const sessionId = getSessionId(sock);
        const config = loadConfig();
        const sessionConfig = getSessionConfig(config, sessionId);

        // ------------------------------------
        // STATUS
        // ------------------------------------

        if (action === "status") {
            const enabled = from.endsWith("@g.us")
                ? sessionConfig.groups?.[from] === true
                : sessionConfig.global === true;

            return await sock.sendMessage(from, {
                text:
                    enabled
                        ? "🟢 PGRAI روشن است (فقط برای همین شماره).\n\nهر پیام معمولی را با Mercury-2 پاسخ می‌دهم."
                        : "🔴 PGRAI خاموش است (فقط برای همین شماره)."
            });
        }

        // ------------------------------------
        // ON
        // ------------------------------------

        if (action === "on") {

            if (from.endsWith("@g.us")) {
                sessionConfig.groups[from] = true;
            } else {
                sessionConfig.global = true;
            }

            saveConfig(config);

            return await sock.sendMessage(from, {
                text:
                    "🟢 *PGRAI فعال شد!* (فقط برای همین شماره)\n\n" +
                    "از حالا پیام‌های معمولی را خودکار پاسخ می‌دهم. 🤖\n\n" +
                    "مدل: `mercury-2`"
            });
        }

        // ------------------------------------
        // OFF
        // ------------------------------------

        if (action === "off") {

            if (from.endsWith("@g.us")) {
                sessionConfig.groups[from] = false;
            } else {
                sessionConfig.global = false;
            }

            saveConfig(config);

            return await sock.sendMessage(from, {
                text:
                    "🔴 *PGRAI خاموش شد!* (فقط برای همین شماره)\n\n" +
                    "دیگر به پیام‌های معمولی خودکار پاسخ نمی‌دهم."
            });
        }

    } catch (error) {
        console.error("PGRAI COMMAND ERROR:", error);

        return await sock.sendMessage(from, {
            text: "❌ خطا در اجرای PGRAI."
        });
    }
}

// ========================================
// بررسی روشن بودن PGRAI (به‌ازای هر سشن/شماره)
// ========================================

function isPgraiEnabled(sessionId, from) {
    const config = loadConfig();
    const sessionConfig = config.sessions?.[sessionId];

    if (!sessionConfig) return false;

    if (from.endsWith("@g.us")) {
        return sessionConfig.groups?.[from] === true;
    }

    return sessionConfig.global === true;
}

// ========================================
// پاسخ خودکار PGRAI
// ========================================

export async function handlePgrai(sock, from, body, m) {
    try {

        // ------------------------------------
        // کلید API
        // ------------------------------------

        if (
            !API_KEY ||
            API_KEY === "YOUR_INCEPTION_API_KEY"
        ) {
            return;
        }

        // ------------------------------------
        // آیا فعال است؟ (مخصوص همین شماره/سشن)
        // ------------------------------------

        const sessionId = getSessionId(sock);

        if (!isPgraiEnabled(sessionId, from)) {
            return;
        }

        // ------------------------------------
        // پیام خود ربات نباشد
        // ------------------------------------

        if (m?.key?.fromMe) {
            return;
        }

        // ------------------------------------
        // متن پیام
        // ------------------------------------

        const text = getMessageText(m);

        if (!text) {
            return;
        }

        // ------------------------------------
        // پیام دستوری نباشد
        // ------------------------------------

        if (
            text.startsWith("!") ||
            text.startsWith("/") ||
            text.startsWith(".")
        ) {
            return;
        }

        // ------------------------------------
        // جلوگیری از پاسخ به پیام‌های خیلی بزرگ
        // ------------------------------------

        if (text.length > 4000) {
            return;
        }

        console.log(
            `🤖 PGRAI MESSAGE [${sessionId}]: ${from} -> ${text}`
        );

        // ------------------------------------
        // ارسال درخواست
        // ------------------------------------

        const response = await axios.post(
            API_URL,
            {
                model: "mercury-2",

                messages: [
                    {
                        role: "user",
                        content: text
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },

                timeout: 120000
            }
        );

        // ------------------------------------
        // گرفتن پاسخ
        // ------------------------------------

        const answer =
            response.data?.choices?.[0]?.message?.content ||
            response.data?.choices?.[0]?.text;

        if (!answer) {
            console.log(
                "❌ PGRAI EMPTY RESPONSE:",
                response.data
            );

            return await sock.sendMessage(from, {
                text: "❌ Mercury-2 پاسخ معتبری ارسال نکرد."
            });
        }

        // ------------------------------------
        // ارسال پاسخ
        // ------------------------------------

        return await sock.sendMessage(from, {
            text: `🤖 *PGRAI*\n\n${answer}`
        });

    } catch (error) {

        console.error(
            "❌ PGRAI API ERROR:",
            error.response?.data || error.message
        );

        const apiError =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

        return await sock.sendMessage(from, {
            text:
                `❌ خطا در PGRAI:\n\n${apiError}`
        });
    }
}
