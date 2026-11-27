import fs from "fs";
import sharp from "sharp";

function escapeXML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
    }[ch]));
}

export default async function allmenu(sock, from, body, m, args) {
    try {
        const pushname = m?.pushName || "کاربر";

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

        const width = 1400;
        const cardWidth = 650;
        const gap = 30;
        const leftX = 35;
        const rightX = leftX + cardWidth + gap;

        const cardHeight = section =>
            125 + section.commands.length * 43;

        const columns = [
            sections.filter((_, i) => i % 2 === 0),
            sections.filter((_, i) => i % 2 === 1)
        ];

        const heights = columns.map(col =>
            col.reduce((sum, section) => sum + cardHeight(section) + 28, 0)
        );

        const height = Math.max(...heights) + 310;

        let svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="${width}" height="${height}"
             viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#071b2e"/>
            <stop offset="100%" stop-color="#10102b"/>
          </linearGradient>
          <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#142e42"/>
            <stop offset="100%" stop-color="#18203a"/>
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00e5c0"/>
            <stop offset="100%" stop-color="#b4ff45"/>
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#bg)"/>

        <text x="700" y="85" text-anchor="middle"
          font-family="Arial" font-size="52" font-weight="bold"
          fill="url(#gold)">RAEES SULTAN BOT</text>

        <text x="700" y="135" text-anchor="middle"
          font-family="Arial" font-size="25" fill="#d7e8f0">
          COMPLETE COMMAND MENU
        </text>

        <line x1="80" y1="165" x2="1320" y2="165"
          stroke="#00e5c0" stroke-width="3"/>
        `;

        function makeColumn(items, x) {
            let y = 195;

            for (const section of items) {
                const h = cardHeight(section);

                svg += `
                <rect x="${x}" y="${y}" width="${cardWidth}" height="${h}"
                  rx="25" fill="url(#card)"
                  stroke="#00cbb0" stroke-width="3"/>

                <rect x="${x + 4}" y="${y + 4}"
                  width="${cardWidth - 8}" height="76"
                  rx="20" fill="#0b4550"/>

                <text x="${x + cardWidth / 2}" y="${y + 49}"
                  text-anchor="middle" font-family="Arial"
                  font-size="27" font-weight="bold"
                  fill="#b8ff58">${escapeXML(section.title)}</text>
                `;

                let commandY = y + 119;

                for (const cmd of section.commands) {
                    svg += `
                    <text x="${x + 35}" y="${commandY}"
                      font-family="Arial" font-size="27"
                      fill="#ffffff">⬡ ${escapeXML(cmd)}</text>
                    `;
                    commandY += 43;
                }

                svg += `
                <line x1="${x + 30}" y1="${y + h - 65}"
                  x2="${x + cardWidth - 30}" y2="${y + h - 65}"
                  stroke="#00cbb0" stroke-width="2"/>

                <text x="${x + cardWidth / 2}" y="${y + h - 25}"
                  text-anchor="middle" font-family="Arial"
                  font-size="23" font-weight="bold"
                  fill="#b8ff58">
                  TOTAL COMMANDS: ${section.total}
                </text>
                `;

                y += h + 28;
            }
        }

        makeColumn(columns[0], leftX);
        makeColumn(columns[1], rightX);

        svg += `
        <line x1="80" y1="${height - 85}" x2="1320" y2="${height - 85}"
          stroke="#00e5c0" stroke-width="3"/>

        <text x="700" y="${height - 40}" text-anchor="middle"
          font-family="Arial" font-size="25" font-weight="bold"
          fill="#ffffff">POWERED BY RAEES SULTAN BOT</text>
        </svg>
        `;

        const menuBuffer = await sharp(Buffer.from(svg))
            .png()
            .toBuffer();

        const imagePath = "./sultan/menu.jpg";

        if (fs.existsSync(imagePath)) {
            try {
                await sock.sendMessage(from, {
                    image: fs.readFileSync(imagePath),
                    caption:
                        `👑 *RAEES SULTAN BOT*\n\n` +
                        `👤 کاربر: ${pushname}\n` +
                        `📦 تعداد بخش‌ها: ${sections.length}\n` +
                        `📚 تمام دستورات در تصویر منو`
                }, { quoted: m });
            } catch (err) {
                console.log("MENU INTRO ERROR:", err.message);
            }
        }

        await sock.sendMessage(from, {
            image: menuBuffer,
            caption: "👑 RAEES SULTAN BOT\n📚 COMPLETE COMMAND LIST"
        }, { quoted: m });

        await sock.sendMessage(from, {
            text: `📞 *پشتیبانی:* wa.me/93794384087\n\n🔥 *POWERED BY 👑 RAEES SULTAN BOT*`,
            footer: "👑 RAEES SULTAN BOT",
            templateButtons: [
                {
                    urlButton: {
                        displayText: "📢 JOIN OFFICIAL CHANNEL",
                        url: "https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H"
                    }
                }
            ]
        }, { quoted: m });

    } catch (e) {
        console.log("ALLMENU ERROR:", e.message);

        try {
            await sock.sendMessage(from, {
                text: "❌ منو ساخته نشد. لطفاً بعداً دوباره تلاش کنید."
            }, { quoted: m });
        } catch {}
    }
}
