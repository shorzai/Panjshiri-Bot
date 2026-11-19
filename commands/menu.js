import fs from "fs";

export default async function menu(sock, from, body, m, args) {
    try {
        const pushname = m.pushName || "کاربر";
        let commandsCount = 0;
        try {
            commandsCount = fs.readdirSync("./commands").filter(f => f.endsWith(".js")).length;
        } catch {}

        // 🚨 1. ارسال عکس منو
        const imagePath = "./sultan/menu.jpg";
        if (fs.existsSync(imagePath)) {
            try {
                await sock.sendMessage(from, {
                    image: fs.readFileSync(imagePath),
                    caption: "👑 *RAEES SULTAN BOT*\n📂 منوی کامل دستورات"
                }, { quoted: m });
            } catch (imageError) {
                console.log("❌ MENU IMAGE ERROR:", imageError.message);
            }
        }

        // 🚨 2. ارسال متن منو
        const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   👑 *R A E E S   S U L T A N* 👑   ┃
┃      *H A C K E R   V A U L T*      ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *کاربر:* ${pushname}
📦 *کل دستورات:* ${commandsCount}
⚡ *وضعیت:* ONLINE 🟢

📢 *کانال رسمی ما:*
https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 🤖 ᴀɪ & sᴍᴀʀᴛ 〕━━━╮
┃ ⬡ !ai
┃ ⬡ !ai-lite
┃ ⬡ !aio
┃ ⬡ !aivoice
┃ ⬡ !smart
┃ ⬡ !pgrai
┃ ⬡ !gpt
┃ ⬡ !chat
┃ ⬡ !imagine
┃ ⬡ !translate
┃ ⬡ !detect
┃ ⬡ !confess
┃ ⬡ !charuma
┃ ⬡ !faceosint
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📥 ᴅᴏᴡɴʟᴏᴀᴅ 〕━━━╮
┃ ⬡ !play
┃ ⬡ !song
┃ ⬡ !music
┃ ⬡ !video
┃ ⬡ !dl
┃ ⬡ !download
┃ ⬡ !ytdl
┃ ⬡ !ytmp3
┃ ⬡ !ytmp4
┃ ⬡ !instagram
┃ ⬡ !tiktok
┃ ⬡ !spotify
┃ ⬡ !facebook
┃ ⬡ !twitter
┃ ⬡ !pinterest
┃ ⬡ !threads
┃ ⬡ !terabox
┃ ⬡ !apk
┃ ⬡ !mediafire
┃ ⬡ !wallpaper
┃ ⬡ !pv
┃ ⬡ !vv
┃ ⬡ !vv2
┃ ⬡ !readvo
┃ ⬡ !reader
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🛡️ sᴇᴄᴜʀɪᴛʏ 〕━━━╮
┃ ⬡ !antilink
┃ ⬡ !antibad
┃ ⬡ !badword
┃ ⬡ !watch
┃ ⬡ !anticall
┃ ⬡ !antidelete
┃ ⬡ !antidelete2
┃ ⬡ !antiforeign
┃ ⬡ !antiimage
┃ ⬡ !antivideo
┃ ⬡ !antiaudio
┃ ⬡ !antibot
┃ ⬡ !antireply
┃ ⬡ !antispam
┃ ⬡ !antiarab
┃ ⬡ !antiemoji
┃ ⬡ !antivirtex
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ⚙️ ᴀᴜᴛᴏ sʏsᴛᴇᴍ 〕━━━╮
┃ ⬡ !autoclear
┃ ⬡ !autolike
┃ ⬡ !autoreact
┃ ⬡ !autostatus
┃ ⬡ !autosticker
┃ ⬡ !autovv
┃ ⬡ !autobio
┃ ⬡ !autochat
┃ ⬡ !autotyping
┃ ⬡ !autorp
┃ ⬡ !autostickergc
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👥 ɢʀᴏᴜᴘ ᴄᴏɴᴛʀᴏʟ 〕━━━╮
┃ ⬡ !kick
┃ ⬡ !kickall
┃ ⬡ !add
┃ ⬡ !addall
┃ ⬡ !promote
┃ ⬡ !demote
┃ ⬡ !removeadmin
┃ ⬡ !tagall
┃ ⬡ !hidetag
┃ ⬡ !ghosttag
┃ ⬡ !listadmin
┃ ⬡ !listonline
┃ ⬡ !linkgc
┃ ⬡ !gcinfo
┃ ⬡ !group
┃ ⬡ !getgroups
┃ ⬡ !getname
┃ ⬡ !getpp
┃ ⬡ !getppall
┃ ⬡ !welcome
┃ ⬡ !goodbye
┃ ⬡ !mute
┃ ⬡ !unmute
┃ ⬡ !open
┃ ⬡ !close
┃ ⬡ !pin
┃ ⬡ !subject
┃ ⬡ !desc
┃ ⬡ !revoke
┃ ⬡ !leave
┃ ⬡ !join
┃ ⬡ !online
┃ ⬡ !afk
┃ ⬡ !lock
┃ ⬡ !unlock
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎮 ғᴜɴ & ɢᴀᴍᴇs 〕━━━╮
┃ ⬡ !rpg
┃ ⬡ !economy
┃ ⬡ !profile
┃ ⬡ !level
┃ ⬡ !rank
┃ ⬡ !gamble
┃ ⬡ !hunt
┃ ⬡ !mafia
┃ ⬡ !box
┃ ⬡ !quote
┃ ⬡ !roast
┃ ⬡ !fact
┃ ⬡ !love
┃ ⬡ !dice
┃ ⬡ !fun
┃ ⬡ !news
┃ ⬡ !random
┃ ⬡ !social
┃ ⬡ !socialnet
┃ ⬡ !8ball
┃ ⬡ !truth
┃ ⬡ !dare
┃ ⬡ !ship
┃ ⬡ !simp
┃ ⬡ !rate
┃ ⬡ !character
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ⚙️ ᴛᴏᴏʟs 〕━━━╮
┃ ⬡ !sticker
┃ ⬡ !calc
┃ ⬡ !qr
┃ ⬡ !password
┃ ⬡ !shorten
┃ ⬡ !setname
┃ ⬡ !bio
┃ ⬡ !weather
┃ ⬡ !check
┃ ⬡ !device
┃ ⬡ !whois
┃ ⬡ !find
┃ ⬡ !save
┃ ⬡ !savecontact
┃ ⬡ !echo
┃ ⬡ !say
┃ ⬡ !clear
┃ ⬡ !delete
┃ ⬡ !count
┃ ⬡ !stats
┃ ⬡ !reverse
┃ ⬡ !color
┃ ⬡ !emoji
┃ ⬡ !fakechat
┃ ⬡ !forward
┃ ⬡ !tts
┃ ⬡ !ssweb
┃ ⬡ !hash
┃ ⬡ !headers
┃ ⬡ !dns
┃ ⬡ !bin
┃ ⬡ !ipinfo
┃ ⬡ !gitip
┃ ⬡ !pdf
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 💥 ᴄʀᴀsʜ & ᴠɪʀᴜs 〕━━━╮
┃ ⬡ !crash
┃ ⬡ !crash2
┃ ⬡ !crash3
┃ ⬡ !crash4
┃ ⬡ !crashpro
┃ ⬡ !advcrash
┃ ⬡ !virus
┃ ⬡ !virose
┃ ⬡ !destroy
┃ ⬡ !destroy2
┃ ⬡ !war
┃ ⬡ !war2
┃ ⬡ !marshal
┃ ⬡ !power
┃ ⬡ !pgr
┃ ⬡ !pgrwar
┃ ⬡ !cam
┃ ⬡ !capsule
┃ ⬡ !nuke
┃ ⬡ !spam
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 💬 sʜᴀᴅᴏᴡ 〕━━━╮
┃ ⬡ !shadow
┃ ⬡ !shadowclear
┃ ⬡ !shadowprofile
┃ ⬡ !shadowwarn
┃ ⬡ !topshadow
┃ ⬡ !weeklyshadow
┃ ⬡ !showder
┃ ⬡ !showder1
┃ ⬡ !showdermenu
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👑 ᴏᴡɴᴇʀ & ɢᴇɴᴇʀᴀʟ 〕━━━╮
┃ ⬡ !owner
┃ ⬡ !onwer
┃ ⬡ !broadcast
┃ ⬡ !block
┃ ⬡ !unblock
┃ ⬡ !otp
┃ ⬡ !report
┃ ⬡ !help
┃ ⬡ !menu
┃ ⬡ !ping
┃ ⬡ !alive
┃ ⬡ !runtime
┃ ⬡ !uptime
┃ ⬡ !info
┃ ⬡ !myid
┃ ⬡ !id
┃ ⬡ !time
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🛒 sᴛᴏʀᴇ (HUBX) 〕━━━╮
┃ ⬡ !hubx store
┃ ⬡ !hubx balance
┃ ⬡ !hubx orders
┃ ⬡ !hubx buy [id] [count]
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📞 *پشتیبانی (سلطان شیرزی):*
wa.me/93794384087

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 *POWERED BY 👑 RAEES SULTAN BOT*
`;

        await sock.sendMessage(from, { text: menuText }, { quoted: m });
    } catch (e) {
        console.log("MENU ERROR:", e.message);
    }
}
