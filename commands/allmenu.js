import fs from "fs";

export default async function allmenu(sock, from, body, m, args) {
    try {
        const pushname = m.pushName || "کاربر";
        let commandsCount = 0;
        try {
            commandsCount = fs.readdirSync("./commands").filter(f => f.endsWith(".js")).length;
        } catch {}

        // 🖼️ ارسال عکس (مطمئن شو عکس با این اسم در پوشه sultan هست، وگرنه اسمش رو عوض کن)
        const imagePath = "./sultan/allmenu.jpg"; // یا هر عکسی که برای منو داری
        if (fs.existsSync(imagePath)) {
            try {
                await sock.sendMessage(from, {
                    image: fs.readFileSync(imagePath),
                    caption: "📖 *RAEES SULTAN BOT - FULL COMMAND LIST*"
                }, { quoted: m });
            } catch (imageError) {
                console.log("❌ MENU IMAGE ERROR:", imageError.message);
            }
        }

        // 📝 ساخت متن منو با استایل ورق کتاب
        const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   👑 *R A E E S   S U L T A N* 👑   ┃
┃      📖 *BOOK OF COMMANDS* 📖      ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *کاربر:* ${pushname}
📦 *کل دستورات:* ${commandsCount}
⚡ *وضعیت:* ONLINE 🟢

📢 *کانال رسمی ما:*
https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 1: AI & SMART*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .ai
⎪ ◇ .ai-lite
⎪ ◇ .aio
⎪ ◇ .aivoice
⎪ ◇ .smart
⎪ ◇ .pgrai
⎪ ◇ .gpt
⎪ ◇ .chat
⎪ ◇ .imagine
⎪ ◇ .translate
⎪ ◇ .detect
⎪ ◇ .confess
⎪ ◇ .charuma
⎪ ◇ .faceosint
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 14

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 2: DOWNLOAD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .play
⎪ ◇ .song
⎪ ◇ .music
⎪ ◇ .video
⎪ ◇ .dl
⎪ ◇ .download
⎪ ◇ .ytdl
⎪ ◇ .ytmp3
⎪ ◇ .ytmp4
⎪ ◇ .instagram
⎪ ◇ .tiktok
⎪ ◇ .spotify
⎪ ◇ .facebook
⎪ ◇ .twitter
⎪ ◇ .pinterest
⎪ ◇ .threads
⎪ ◇ .terabox
⎪ ◇ .apk
⎪ ◇ .mediafire
⎪ ◇ .wallpaper
⎪ ◇ .pv
⎪ ◇ .vv
⎪ ◇ .vv2
⎪ ◇ .readvo
⎪ ◇ .reader
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 25

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 3: SECURITY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .antilink
⎪ ◇ .antibad
⎪ ◇ .badword
⎪ ◇ .watch
⎪ ◇ .anticall
⎪ ◇ .antidelete
⎪ ◇ .antidelete2
⎪ ◇ .antiforeign
⎪ ◇ .antiimage
⎪ ◇ .antivideo
⎪ ◇ .antiaudio
⎪ ◇ .antibot
⎪ ◇ .antireply
⎪ ◇ .antispam
⎪ ◇ .antiarab
⎪ ◇ .antiemoji
⎪ ◇ .antivirtex
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 17

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 4: AUTO SYSTEM*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .autoclear
⎪ ◇ .autolike
⎪ ◇ .autoreact
⎪ ◇ .autostatus
⎪ ◇ .autosticker
⎪ ◇ .autovv
⎪ ◇ .autobio
⎪ ◇ .autochat
⎪ ◇ .autotyping
⎪ ◇ .autorp
⎪ ◇ .autostickergc
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 11

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 5: GROUP CONTROL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .kick
⎪ ◇ .kickall
⎪ ◇ .add
⎪ ◇ .addall
⎪ ◇ .promote
⎪ ◇ .demote
⎪ ◇ .removeadmin
⎪ ◇ .tagall
⎪ ◇ .hidetag
⎪ ◇ .ghosttag
⎪ ◇ .listadmin
⎪ ◇ .listonline
⎪ ◇ .linkgc
⎪ ◇ .gcinfo
⎪ ◇ .group
⎪ ◇ .getgroups
⎪ ◇ .getname
⎪ ◇ .getpp
⎪ ◇ .getppall
⎪ ◇ .welcome
⎪ ◇ .goodbye
⎪ ◇ .mute
⎪ ◇ .unmute
⎪ ◇ .open
⎪ ◇ .close
⎪ ◇ .pin
⎪ ◇ .subject
⎪ ◇ .desc
⎪ ◇ .revoke
⎪ ◇ .leave
⎪ ◇ .join
⎪ ◇ .online
⎪ ◇ .afk
⎪ ◇ .lock
⎪ ◇ .unlock
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 35

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 6: FUN & GAMES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .rpg
⎪ ◇ .economy
⎪ ◇ .profile
⎪ ◇ .level
⎪ ◇ .rank
⎪ ◇ .gamble
⎪ ◇ .hunt
⎪ ◇ .mafia
⎪ ◇ .box
⎪ ◇ .quote
⎪ ◇ .roast
⎪ ◇ .fact
⎪ ◇ .love
⎪ ◇ .dice
⎪ ◇ .fun
⎪ ◇ .news
⎪ ◇ .random
⎪ ◇ .social
⎪ ◇ .socialnet
⎪ ◇ .8ball
⎪ ◇ .truth
⎪ ◇ .dare
⎪ ◇ .ship
⎪ ◇ .simp
⎪ ◇ .rate
⎪ ◇ .character
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 26

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 7: TOOLS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .sticker
⎪ ◇ .calc
⎪ ◇ .qr
⎪ ◇ .password
⎪ ◇ .shorten
⎪ ◇ .setname
⎪ ◇ .bio
⎪ ◇ .weather
⎪ ◇ .check
⎪ ◇ .device
⎪ ◇ .whois
⎪ ◇ .find
⎪ ◇ .save
⎪ ◇ .savecontact
⎪ ◇ .echo
⎪ ◇ .say
⎪ ◇ .clear
⎪ ◇ .delete
⎪ ◇ .count
⎪ ◇ .stats
⎪ ◇ .reverse
⎪ ◇ .color
⎪ ◇ .emoji
⎪ ◇ .fakechat
⎪ ◇ .forward
⎪ ◇ .tts
⎪ ◇ .ssweb
⎪ ◇ .hash
⎪ ◇ .headers
⎪ ◇ .dns
⎪ ◇ .bin
⎪ ◇ .ipinfo
⎪ ◇ .gitip
⎪ ◇ .pdf
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 34

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 8: CRASH & VIRUS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .crash
⎪ ◇ .crash2
⎪ ◇ .crash3
⎪ ◇ .crash4
⎪ ◇ .crashpro
⎪ ◇ .advcrash
⎪ ◇ .virus
⎪ ◇ .virose
⎪ ◇ .destroy
⎪ ◇ .destroy2
⎪ ◇ .war
⎪ ◇ .war2
⎪ ◇ .marshal
⎪ ◇ .power
⎪ ◇ .pgr
⎪ ◇ .pgrwar
⎪ ◇ .cam
⎪ ◇ .capsule
⎪ ◇ .nuke
⎪ ◇ .spam
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 9: SHADOW*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .shadow
⎪ ◇ .shadowclear
⎪ ◇ .shadowprofile
⎪ ◇ .shadowwarn
⎪ ◇ .topshadow
⎪ ◇ .weeklyshadow
⎪ ◇ .showder
⎪ ◇ .showder1
⎪ ◇ .showdermenu
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 9

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 10: OWNER & GENERAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .owner
⎪ ◇ .onwer
⎪ ◇ .broadcast
⎪ ◇ .block
⎪ ◇ .unblock
⎪ ◇ .otp
⎪ ◇ .report
⎪ ◇ .help
⎪ ◇ .menu
⎪ ◇ .ping
⎪ ◇ .alive
⎪ ◇ .runtime
⎪ ◇ .uptime
⎪ ◇ .info
⎪ ◇ .myid
⎪ ◇ .id
⎪ ◇ .time
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 17

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PAGE 11: STORE (HUBX)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⎪ ◇ .hubx store
⎪ ◇ .hubx balance
⎪ ◇ .hubx orders
⎪ ◇ .hubx buy
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⎪ TOTAL COMMANDS : 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *پشتیبانی (سلطان شیرزی):*
wa.me/93794384087

🔥 *POWERED BY 👑 RAEES SULTAN BOT*
`;

        // 🚀 ارسال متن منو
        await sock.sendMessage(from, { text: menuText }, { quoted: m });

    } catch (e) {
        console.log("ALLMENU ERROR:", e.message);
    }
}
