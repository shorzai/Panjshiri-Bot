import fs from "fs";
import smart from "./commands/smart.js";
import crashCmd, { stopCrash } from "./commands/crash.js";
import { checkAntilink } from "./commands/antilink.js";
import { checkBadWord } from "./commands/badword.js";
import { checkAntiReply } from "./commands/antireply.js";
import { checkWatch } from "./commands/watch.js";
import { handleRPGInput } from "./lib/rpg_engine.js";
import { trackSocial } from "./commands/social.js";

const commands = new Map();
const showderFile = "./data/showder.json";
let lastMessages = new Map();
global.afkUsers = global.afkUsers || new Map();

const badWords = ["حرامی ", "کص مادر", "badword"];

function canLearn(text) {
    const t = text.toLowerCase();
    if (t.includes("http") || t.includes("www.")) return false;
    if (t.length < 3 || t.length > 500) return false;
    for (const word of badWords) { if (t.includes(word)) return false; }
    return true;
}

function loadShowder() {
    if (!fs.existsSync(showderFile)) {
        fs.mkdirSync("./data", { recursive: true });
        fs.writeFileSync(showderFile, JSON.stringify({ private: {}, group: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(showderFile, "utf8"));
}

function saveShowder(data) {
    fs.writeFileSync(showderFile, JSON.stringify(data, null, 2));
}

function cleanText(text) {
    return text.toLowerCase().replace(/[؟?!.,،]/g, "").trim();
}

const files = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of files) {
    try {
        const cmd = await import(`./commands/${file}`);
        if (cmd.default) commands.set(file.replace(".js", "").toLowerCase(), cmd.default);
    } catch (e) { console.log("LOAD ERROR:", file, e.message); }
}

export default async function handler(sock, from, body, m) {
    try {
        if (!body) return;
        body = body.trim();

        // 🚨 اگر پیام از خودت بود و با ! شروع نشده بود، نادیده بگیر (برای جلوگیری از حلقه)
        if (m.key.fromMe && !body.startsWith("!")) {
            return;
        }

        try { trackSocial(from, m); } catch (e) {}

        // بررسی دستورات (این بخش باید برای پیام‌های خودت هم کار کنه)
        let commandText = body.trim();
        if (/^!play/i.test(commandText)) {
            const query = commandText.slice(5).trim();
            commandText = query ? `!play ${query}` : "!play";
        }

        const match = commandText.match(/^!(\S+)(?:\s+(.*))?$/s);
        if (match) {
            const command = match[1].toLowerCase();
            const args = match[2] ? match[2].trim().split(/\s+/) : [];
            const cmd = commands.get(command);

            if (cmd) {
                try { await cmd(sock, from, commandText, m, args); } catch (e) { console.log(e); }
                return;
            }
        }

        // اگر پیام از خودت بود و دستور نبود، نادیده بگیر
        if (m.key.fromMe) return;

        // سیستم‌های امنیتی و AFK
        try {
            const senderJid = m.key.participant || m.key.remoteJid;
            if (global.afkUsers.has(senderJid) && !body.startsWith("!afk")) {
                global.afkUsers.delete(senderJid);
                await sock.sendMessage(from, { text: "👋 خوش برگشتی! وضعیت AFK شما حذف شد." }, { quoted: m });
            }
        } catch (e) {}

        try { if (await checkAntilink(sock, from, body, m)) return; } catch (e) {}
        try { if (await checkBadWord(sock, from, body, m)) return; } catch (e) {}
        try { if (await checkAntiReply(sock, from, body, m)) return; } catch (e) {}
        try { await checkWatch(sock, from, body, m); } catch (e) {}

        try {
            const isRPG = await handleRPGInput(sock, from, body, m);
            if (isRPG) return;
        } catch (e) {}

        // شوادر و هوش مصنوعی
        if (!body.startsWith("!")) {
            const memory = loadShowder();
            const type = from.includes("@g.us") ? "group" : "private";
            if (!memory[type]) memory[type] = {};
            const text = cleanText(body);

            if (memory._status !== false && memory[type][text]) {
                let answers = memory[type][text];
                if (!Array.isArray(answers)) answers = [{ text: answers, score: 1 }];
                answers.sort((a, b) => b.score - a.score);
                let answer = answers[0];
                answer.score++;
                saveShowder(memory);
                await sock.sendMessage(from, { text: answer.text }, { quoted: m });
                return;
            }
            try { await smart(sock, from, body, m); } catch (e) {}
            return;
        }

    } catch (e) {
        console.log("HANDLER ERROR:", e);
    }
}
