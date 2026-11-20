import fs from "fs";

// 🔤 تبدیل متن عادی به حروف بولد-سریف یونیکد (مثل تصویر نمونه)
function toBoldSerif(str) {
    const map = {};
    const upperStart = 0x1D400; // 𝐀
    const lowerStart = 0x1D41A; // 𝐚
    const digitStart = 0x1D7CE; // 𝟎
    for (let i = 0; i < 26; i++) {
        map[String.fromCharCode(65 + i)] = String.fromCodePoint(upperStart + i); // A-Z
        map[String.fromCharCode(97 + i)] = String.fromCodePoint(lowerStart + i); // a-z
    }
    for (let i = 0; i < 10; i++) {
        map[String(i)] = String.fromCodePoint(digitStart + i); // 0-9
    }
    return str.split("").map(ch => map[ch] || ch).join("");
}

export default async function allmenu(sock, from, body, m, args) {
    try {
        const pushname = m.pushName || "کاربر";
        let commandsCount = 0;
        try {
            commandsCount = fs.readdirSync("./commands").filter(f => f.endsWith(".js")).length;
        } catch {}

        const imagePath = "./sultan/menu.jpg";
        if (fs.existsSync(imagePath)) {
            try {
                await sock.sendMessage(from, {
                    image: fs.readFileSync(imagePath),
                    caption: `👑 *RAEES SULTAN BOT*\n\n👤 کاربر: ${pushname}\n📦 دستورات: ${commandsCount}\n\n📚 لیست دستورات به صورت صفحات شناور برای شما ارسال می‌شود...`
                }, { quoted: m });
            } catch (imageError) {
                console.log("❌ MENU IMAGE ERROR:", imageError.message);
            }
        }

        // هر بخش را در یک پیام جداگانه ارسال میکنیم تا شناور به نظر برسند
        const sections = [
            {
                title: "AI COMMAND LIST",
                total: 14,
                commands: [".ai", ".ai-lite", ".aio", ".aivoice", ".smart", ".pgrai", ".gpt", ".chat", ".imagine", ".translate", ".detect", ".confess", ".charuma", ".faceosint"]
            },
            {
                title: "DOWNLOAD COMMAND LIST",
                total: 25,
                commands: [".play", ".song", ".music", ".video", ".dl", ".download", ".ytdl", ".ytmp3", ".ytmp4", ".instagram", ".tiktok", ".spotify", ".facebook", ".twitter", ".pinterest", ".threads", ".terabox", ".apk", ".mediafire", ".wallpaper", ".pv", ".vv", ".vv2", ".readvo", ".reader"]
            },
            {
                title: "SECURITY COMMAND LIST",
                total: 17,
                commands: [".antilink", ".antibad", ".badword", ".watch", ".anticall", ".antidelete", ".antidelete2", ".antiforeign", ".antiimage", ".antivideo", ".antiaudio", ".antibot", ".antireply", ".antispam", ".antiarab", ".antiemoji", ".antivirtex"]
            },
            {
                title: "AUTO SYSTEM COMMAND LIST",
                total: 11,
                commands: [".autoclear", ".autolike", ".autoreact", ".autostatus", ".autosticker", ".autovv", ".autobio", ".autochat", ".autotyping", ".autorp", ".autostickergc"]
            },
            {
                title: "GROUP COMMAND LIST",
                total: 35,
                commands: [".kick", ".kickall", ".add", ".addall", ".promote", ".demote", ".removeadmin", ".tagall", ".hidetag", ".ghosttag", ".listadmin", ".listonline", ".linkgc", ".gcinfo", ".group", ".getgroups", ".getname", ".getpp", ".getppall", ".welcome", ".goodbye", ".mute", ".unmute", ".open", ".close", ".pin", ".subject", ".desc", ".revoke", ".leave", ".join", ".online", ".afk", ".lock", ".unlock"]
            },
            {
                title: "FUN & GAMES COMMAND LIST",
                total: 26,
                commands: [".rpg", ".economy", ".profile", ".level", ".rank", ".gamble", ".hunt", ".mafia", ".box", ".quote", ".roast", ".fact", ".love", ".dice", ".fun", ".news", ".random", ".social", ".socialnet", ".8ball", ".truth", ".dare", ".ship", ".simp", ".rate", ".character"]
            },
            {
                title: "TOOLS COMMAND LIST",
                total: 34,
                commands: [".sticker", ".calc", ".qr", ".password", ".shorten", ".setname", ".bio", ".weather", ".check", ".device", ".whois", ".find", ".save", ".savecontact", ".echo", ".say", ".clear", ".delete", ".count", ".stats", ".reverse", ".color", ".emoji", ".fakechat", ".forward", ".tts", ".ssweb", ".hash", ".headers", ".dns", ".bin", ".ipinfo", ".gitip", ".pdf"]
            },
            {
                title: "CRASH & VIRUS COMMAND LIST",
                total: 20,
                commands: [".crash", ".crash2", ".crash3", ".crash4", ".crashpro", ".advcrash", ".virus", ".virose", ".destroy", ".destroy2", ".war", ".war2", ".marshal", ".power", ".pgr", ".pgrwar", ".cam", ".capsule", ".nuke", ".spam"]
            },
            {
                title: "SHADOW COMMAND LIST",
                total: 9,
                commands: [".shadow", ".shadowclear", ".shadowprofile", ".shadowwarn", ".topshadow", ".weeklyshadow", ".showder", ".showder1", ".showdermenu"]
            },
            {
                title: "OWNER & GENERAL COMMAND LIST",
                total: 17,
                commands: [".owner", ".onwer", ".broadcast", ".block", ".unblock", ".otp", ".report", ".help", ".menu", ".ping", ".alive", ".runtime", ".uptime", ".info", ".myid", ".id", ".time"]
            },
            {
                title: "HUBX STORE COMMAND LIST",
                total: 4,
                commands: [".hubx store", ".hubx balance", ".hubx orders", ".hubx buy"]
            }
        ];

        // 🎨 ساخت باکس به سبک تصویر نمونه (◆ گوشه‌ها + ⬡ بولت‌ها + حروف بولد-سریف)
        function buildBox(section) {
            const boldTitle = toBoldSerif(section.title);
            const boldTotalLabel = toBoldSerif("TOTAL COMMANDS LIST");
            const topLine = `┌─────── ◆ ${boldTitle} ◆ ───────`;
            const bottomLine = "────────────────────────── L";

            let text = `${topLine}\n│\n`;
            for (const cmd of section.commands) {
                text += `│  ⬡  ${cmd}\n`;
            }
            text += `│\n`;
            text += `│  ${boldTotalLabel} : ${section.total}\n`;
            text += `${bottomLine}`;
            return text;
        }

        // 🚀 ارسال هر بخش در یک پیام جداگانه (شبیه به کارت شناور)
        for (const section of sections) {
            const text = buildBox(section);
            await sock.sendMessage(from, { text });
            // یک مکث کوتاه بین پیام‌ها تا اسپم نشود و کاربر بتواند بخواند
            await new Promise(r => setTimeout(r, 800));
        }

        // 🚀 ارسال پیام آخر با دکمه لینک کانال
        await sock.sendMessage(from, {
            text: `📞 *پشتیبانی:* wa.me/93794384087\n\n🔥 *POWERED BY 👑 RAEES SULTAN BOT*`,
            footer: "👑 RAEES SULTAN BOT",
            templateButtons: [
                {
                    urlButton: {
                        displayText: '📢 JOIN OFFICIAL CHANNEL',
                        url: 'https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H'
                    }
                }
            ]
        }, { quoted: m });

    } catch (e) {
        console.log("ALLMENU ERROR:", e.message);
    }
}
