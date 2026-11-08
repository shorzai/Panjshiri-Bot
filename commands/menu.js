// =======================
// MENU.JS — FULL VERTICAL LIST + BUTTON + PHONE
// =======================

import fs from "fs";
import os from "os";
import {
  proto,
  generateWAMessageFromContent,
  isJidGroup
} from "@whiskeysockets/baileys";
import { activeSessions } from "../bot.js";

export default async function menu(sock, from, body, m, args) {
  try {
    const startPing = Date.now();
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
    const ram = Math.round((memory / totalMemory) * 100);
    const ping = Date.now() - startPing;

    let commandsCount = 0;
    try {
      commandsCount = fs.readdirSync("./commands").filter(f => f.endsWith(".js")).length;
    } catch {}

    const pushname = m.pushName || "User";
    const onlineUsersCount = activeSessions.size;
    const isGroup = isJidGroup(from);

    // =======================
    // 1 — ارسال عکس منو
    // =======================
    const imagePath = "./sultan/menu.jpg";
    if (fs.existsSync(imagePath)) {
      try {
        await sock.sendMessage(from, {
          image: fs.readFileSync(imagePath),
          caption: "👑 *RAEES SULTAN BOT*\n📂 منوی اصلی (لیست کامل دستورات)"
        });
      } catch (imageError) {
        console.log("❌ MENU IMAGE ERROR:", imageError.message);
      }
    }

    // =======================
    // 2 — متن کامل منو (هر دستور در یک خط + شماره شما در آخر)
    // =======================
    const menuText = `
*👑 RAEES SULTAN BOT*
━━━━━━━━━━━━━━━━━━━━━
👤 *کاربر:* ${pushname}
⚡ *پینگ:* ${ping}ms
⏱️ *آپتایم:* ${hours}h ${minutes}m
📦 *دستورات:* ${commandsCount}
💾 *رم:* ${ram}%
🟢 *آنلاین:* ${onlineUsersCount} کاربر
━━━━━━━━━━━━━━━━━━━━━

『 🤖 هوش مصنوعی (AI) 』
▫️ !ai
▫️ !ai-lite
▫️ !aio
▫️ !aivoice
▫️ !smart
▫️ !pgrai
▫️ !gpt
▫️ !translate
▫️ !detect
▫️ !confess
▫️ !charuma
▫️ !faceosint

『 📥 دانلودر (DOWNLOAD) 』
▫️ !play
▫️ !song
▫️ !music
▫️ !video
▫️ !dl
▫️ !download
▫️ !instagram
▫️ !tiktok
▫️ !spotify
▫️ !pv
▫️ !vv
▫️ !vv2
▫️ !readvo
▫️ !reader

『 🛡️ امنیت (SECURITY) 』
▫️ !antilink
▫️ !antibad
▫️ !badword
▫️ !watch
▫️ !anticall
▫️ !antidelete
▫️ !antidelete2
▫️ !antiforeign
▫️ !antiimage
▫️ !antivideo
▫️ !antiaudio
▫️ !antibot
▫️ !antireply
▫️ !antispam
▫️ !antiarab
▫️ !antiemoji

『 ⚙️ تنظیمات خودکار (AUTO) 』
▫️ !autoclear
▫️ !autolike
▫️ !autoreact
▫️ !autostatus
▫️ !autosticker
▫️ !autovv
▫️ !autobio
▫️ !autochat

『 👥 مدیریت گروه (GROUP) 』
▫️ !kick
▫️ !kickall
▫️ !add
▫️ !addall
▫️ !promote
▫️ !demote
▫️ !removeadmin
▫️ !tagall
▫️ !hidetag
▫️ !ghosttag
▫️ !listadmin
▫️ !listonline
▫️ !linkgc
▫️ !gcinfo
▫️ !group
▫️ !getgroups
▫️ !getname
▫️ !getpp
▫️ !getppall
▫️ !welcome
▫️ !goodbye
▫️ !mute
▫️ !unmute
▫️ !open
▫️ !close
▫️ !pin
▫️ !subject
▫️ !desc
▫️ !revoke
▫️ !leave
▫️ !join
▫️ !online

『 🎮 بازی و اقتصاد (FUN) 』
▫️ !rpg
▫️ !economy
▫️ !profile
▫️ !level
▫️ !rank
▫️ !gamble
▫️ !hunt
▫️ !mafia
▫️ !box
▫️ !quote
▫️ !roast
▫️ !fact
▫️ !love
▫️ !dice
▫️ !fun
▫️ !news
▫️ !random
▫️ !social
▫️ !socialnet

『 ⚙️ ابزارها (TOOLS) 』
▫️ !sticker
▫️ !calc
▫️ !qr
▫️ !password
▫️ !shorten
▫️ !setname
▫️ !bio
▫️ !weather
▫️ !check
▫️ !device
▫️ !whois
▫️ !find
▫️ !save
▫️ !savecontact
▫️ !echo
▫️ !say
▫️ !clear
▫️ !delete
▫️ !count
▫️ !stats
▫️ !reverse
▫️ !color
▫️ !emoji
▫️ !fakechat
▫️ !forward

『 💥 نفوذ و جنگ (CRASH) 』
▫️ !crash
▫️ !crash2
▫️ !crash3
▫️ !crash4
▫️ !crashpro
▫️ !advcrash
▫️ !virus
▫️ !virose
▫️ !destroy
▫️ !destroy2
▫️ !war
▫️ !war2
▫️ !marshal
▫️ !power
▫️ !pgr
▫️ !pgrwar
▫️ !cam
▫️ !capsule

『 💬 سیستم شادو (SHADOW) 』
▫️ !shadow
▫️ !shadowclear
▫️ !shadowprofile
▫️ !shadowwarn
▫️ !topshadow
▫️ !weeklyshadow
▫️ !showder
▫️ !showder1
▫️ !showdermenu

『 👑 مالک (OWNER) 』
▫️ !owner
▫️ !onwer
▫️ !broadcast
▫️ !block
▫️ !unblock
▫️ !otp
▫️ !report
▫️ !help

『 📊 عمومی (GENERAL) 』
▫️ !menu
▫️ !ping
▫️ !alive
▫️ !runtime
▫️ !uptime
▫️ !info
▫️ !myid
▫️ !id
▫️ !time
━━━━━━━━━━━━━━━━━━━━━
📞 *شماره تماس سازنده:* wa.me/93794384087
🔥 *POWERED BY 👑 RAEES SULTAN BOT*
`;

    // ارسال متن منو
    await sock.sendMessage(from, { text: menuText }, { quoted: m });

    // =======================
    // 3 — ارسال دکمه لینک کانال
    // =======================
    const interactiveMsg = generateWAMessageFromContent(
      from,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: "📢 برای دریافت آخرین اخبار و ترفندهای ربات، عضو کانال رسمی ما شوید:"
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: "👑 RAEES SULTAN BOT"
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                      display_text: "📢 ورود به کانال واتساپ",
                      url: "https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H",
                      merchant_url: "https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H"
                    })
                  }
                ]
              })
            })
          }
        }
      },
      { userJid: sock.user?.id }
    );

    const additionalNodes = isGroup
      ? [{ tag: "biz", attrs: {}, content: [{ tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }] }, { tag: "quality_control", attrs: { source_type: "third_party" } }] }]
      : [{ tag: "bot", attrs: { biz_bot: "1" } }, { tag: "biz", attrs: {}, content: [{ tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }] }, { tag: "quality_control", attrs: { source_type: "third_party" } }] }];

    await sock.relayMessage(from, interactiveMsg.message, {
      messageId: interactiveMsg.key.id,
      additionalNodes
    });
    
  } catch (e) {
    console.log("❌ MENU ERROR:", e);
  }
}