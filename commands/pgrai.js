import axios from "axios";
import fs from "fs";
import path from "path";

const API_KEY = "sk_19bd4fe7932b84b43e7652f9a621d4da"; 
const API_URL = "https://api.inceptionlabs.ai/v1/chat/completions"\;

const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "pgrai.json");

function loadConfig() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = { bots: {} };
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return { bots: {}, ...data };
    } catch (error) {
        return { bots: {} };
    }
}

function saveConfig(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {}
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
    } catch (error) { return false; }
}

function getMessageText(m) {
    return (m?.message?.conversation || m?.message?.extendedTextMessage?.text || m?.message?.imageMessage?.caption || m?.message?.videoMessage?.caption || "").trim();
}

export default async function pgrai(sock, from, body, m, args) {
    try {
        const action = args?.[0]?.toLowerCase();
        if (!["on", "off", "status"].includes(action)) {
            return await sock.sendMessage(from, { text: "PGRAI Commands: !pgrai on, !pgrai off, !pgrai status" });
        }

        const admin = await isAdmin(sock, from, m);
        if (!admin) return await sock.sendMessage(from, { text: "Only admins can change PGRAI." });

        const botId = sock.user.id.split(":")[0];
        const config = loadConfig();
        if (!config.bots[botId]) config.bots[botId] = { private: false, groups: {} };

        if (action === "status") {
            const enabled = from.endsWith("@g.us")
                ? config.bots[botId].groups?.[from] === true
                : config.bots[botId].private === true;
            return await sock.sendMessage(from, { text: enabled ? "PGRAI is ON" : "PGRAI is OFF" });
        }

        if (action === "on") {
            if (from.endsWith("@g.us")) config.bots[botId].groups[from] = true;
            else config.bots[botId].private = true;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "PGRAI is now ON" });
        }

        if (action === "off") {
            if (from.endsWith("@g.us")) config.bots[botId].groups[from] = false;
            else config.bots[botId].private = false;
            saveConfig(config);
            return await sock.sendMessage(from, { text: "PGRAI is now OFF" });
        }
    } catch (error) {
        console.error("PGRAI COMMAND ERROR:", error);
        return await sock.sendMessage(from, { text: "Error in PGRAI command." });
    }
}

function isPgraiEnabled(sock, from) {
    const botId = sock.user.id.split(":")[0];
    const config = loadConfig();
    const botConfig = config.bots[botId];
    if (!botConfig) return false;
    if (from.endsWith("@g.us")) return botConfig.groups?.[from] === true;
    return botConfig.private === true;
}

export async function handlePgrai(sock, from, body, m) {
    try {
        if (!isPgraiEnabled(sock, from)) return;
        if (m?.key?.fromMe) return;
        const text = getMessageText(m);
        if (!text || text.startsWith("!") || text.startsWith("/") || text.startsWith(".") || text.length > 4000) return;

        const lowerText = text.toLowerCase();
        if (
            lowerText.includes("who are you") || 
            lowerText.includes("تو کی هستی") || 
            lowerText.includes("کی هستی") || 
            lowerText.includes("اسمت چیه") ||
            lowerText.includes("your name")
        ) {
            return await sock.sendMessage(from, { 
                text: "من پنجشیری AI هستم، ساخته شده توسط شیرزی پنجشیری." 
            });
        }

        const response = await axios.post(API_URL, {
            model: "mercury-2",
            messages: [
                { 
                    role: "system", 
                    content: "You are Panjshiri AI, created by Shirzai Panjshiri. Answer in the user's language." 
                },
                { role: "user", content: text }
            ]
        }, {
            headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            timeout: 120000
        });

        const answer = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text;
        
        if (!answer) {
            return await sock.sendMessage(from, { text: "No response received from AI." });
        }

        return await sock.sendMessage(from, { text: `پنجشیری AI:\n\n${answer}` });

    } catch (error) {
        console.error("PGRAI API ERROR:", error.message);
        return await sock.sendMessage(from, { 
            text: `Error: ${error.message}` 
        });
    }
}
