import axios from "axios";
import fs from "fs";
import path from "path";

function loadConfig() {
    try {
        if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
        if (!fs.existsSync("./data/chatbot.json")) {
            const defaultData = { global: false, groups: {} };
            fs.writeFileSync("./data/chatbot.json", JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = JSON.parse(fs.readFileSync("./data/chatbot.json", "utf8"));
        return { global: false, groups: {}, ...data };
    } catch (error) {
        console.error("CHATBOTCONFIG ERROR:", error);
        return { global: false, groups: {} };
    }
}

function saveConfig(data) {
    try {
        if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
        fs.writeFileSync("./data/chatbot.json", JSON.stringify(data, null, 2));
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
            return await sock.sendMessage(from, { text: "chatbot command" }, { quoted: m });
        }
        const admin = await isAdmin(sock, from, m);
        if (!admin) return await sock.sendMessage(from, { text: "not admin" }, { quoted: m });

        const config = loadConfig();

        if (action === "status") {
            const enabled = from.endsWith("@g.us") ? config.groups?.[from] === true : config.global === true;
            return await sock.sendMessage(from, { text: enabled ? "on" : "off" }, { quoted: m });
        }

        if (action === "on") {
            if (from.endsWith("@g.us")) config.groups[from] = true;
            else config.global = true;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "on" }, { quoted: m });
        }

        if (action === "off") {
            if (from.endsWith("@g.us")) config.groups[from] = false;
            else config.global = false;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "off" }, { quoted: m });
        }
    } catch (error) {
        console.error("CHATBOT COMMAND ERROR:", error);
        return await sock.sendMessage(from, { text: "error" }, { quoted: m });
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

        const pushname = m.pushName || "user";
        const sender = m?.key?.participant || m?.key?.remoteJid || from;
        const session = sender.split("@")[0].split(":")[0];

        const response = await axios.get("https://pro-apis.zone.id/api/ai/chatbot", {
            params: { key: "freekey", q: text, session: session, name: pushname },
            timeout: 30000
        });

        const result = response.data;
        if (!result?.success || !result?.data?.response) return;

        return await sock.sendMessage(from, { text: result.data.response });
    } catch (error) {
        console.error("CHATBOT API ERROR:", error.response?.data || error.message);
    }
}