import axios from "axios";
import fs from "fs";
import path from "path";

const API_KEY = "freekey";
const API_URL = "https://pro-apis.zone.id/api/ai/chatbot"\;

const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "chatbot.json");

function loadConfig() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = { global: false, groups: {} };
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return { global: false, groups: {}, ...data };
    } catch (error) {
        console.error("CHATBOT CONFIG ERROR:", error);
        return { global: false, groups: {} };
    }
}

function saveConfig(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("CHATBOT SAVE ERROR:", error);
    }
}

async function isAdmin(sock, from, m) {
    try {
        if (!from.endsWith("@g.us")) return true;
        const metadata = await sock.groupMetadata(from);
        const sender = m?.key?.participant || m?.participant || "";
        const botJid = sock?.user?.id || "";
        const normalize = jid => jid?.split(":")[0]?.split("@")[0];
        const senderNumber = normalize(sender);
        const botNumber = normalize(botJid);
        if (senderNumber && senderNumber === botNumber) return true;
        const participant = metadata.participants?.find(p => normalize(p.id) === senderNumber);
        return participant?.admin === "admin" || participant?.admin === "superadmin";
    } catch (error) {
        console.error("CHATBOT ADMIN CHECK ERROR:", error);
        return false;
    }
}

function getMessageText(m) {
    return (m?.message?.conversation || m?.message?.extendedTextMessage?.text || m?.message?.imageMessage?.caption || m?.message?.videoMessage?.caption || "").trim();
}

export default async function chatbot(sock, from, body, m, args) {
    try {
        const action = args?.[0]?.toLowerCase();
        if (!["on", "off", "status"].includes(action)) {
            return await sock.sendMessage(from, { text: "💬 *AI CHATBOT*\n\n➜ .chatbot on\n➜ .chatbot off\n➜ .chatbot status" }, { quoted: m });
        }
        const admin = await isAdmin(sock, from, m);
        if (!admin) return await sock.sendMessage(from, { text: "❌ فقط ادمین گروه می‌تواند CHATBOT را تغییر دهد." }, { quoted: m });

        const config = loadConfig();

        if (action === "status") {
            const enabled = from.endsWith("@g.us") ? config.groups?.[from] === true : config.global === true;
            return await sock.sendMessage(from, { text: enabled ? "🟢 CHATBOT روشن است." : "🔴 CHATBOT خاموش است." }, { quoted: m });
        }

        if (action === "on") {
            if (from.endsWith("@g.us")) config.groups[from] = true;
            else config.global = true;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "🟢 *CHATBOT فعال شد!*" }, { quoted: m });
        }

        if (action === "off") {
            if (from.endsWith("@g.us")) config.groups[from] = false;
            else config.global = false;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "🔴 *CHATBOT خاموش شد!*" }, { quoted: m });
        }
    } catch (error) {
        console.error("CHATBOT COMMAND ERROR:", error);
        return await sock.sendMessage(from, { text: "❌ خطا در اجرای CHATBOT." }, { quoted: m });
    }
}

function isChatbotEnabled(from) {
    const config = loadConfig();
    if (from.endsWith("@g.us")) return config.groups?.[from] === true;
    return config.global === true;
}

export async function handleChatbot(sock, from, body, m) {
    try {
        if (!isChatbotEnabled(from)) return;
        if (m?.key?.fromMe) return;
        const text = getMessageText(m);
        if (!text) return;
        if (text.startsWith("!") || text.startsWith("/") || text.startsWith(".")) return;
        if (text.length > 4000) return;

        const pushname = m.pushName || "کاربر";
        const sender = m?.key?.participant || m?.key?.remoteJid || from;
        const session = sender.split("@")[0].split(":")[0];

        console.log(`💬 CHATBOT MESSAGE: ${from} -> ${text}`);

        const response = await axios.get(API_URL, {
            params: { key: API_KEY, q: text, session: session, name: pushname },
            timeout: 30000
        });

        const result = response.data;
        if (!result?.success || !result?.data?.response) return;

        return await sock.sendMessage(from, { text: `💬 ${result.data.response}` });
    } catch (error) {
        console.error("❌ CHATBOT API ERROR:", error.response?.data || error.message);
    }
}
