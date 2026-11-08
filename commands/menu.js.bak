// =======================
// MENU.JS — SELECT MENU + IMAGE
// =======================

import fs from "fs";
import os from "os";
import {
  proto,
  generateWAMessageFromContent,
  isJidGroup
} from "@whiskeysockets/baileys";

export default async function menu(sock, from, body, m, args) {
  try {

    console.log("MENU COMMAND REACHED");

    // =======================
    // SYSTEM INFO
    // =======================

    const startPing = Date.now();

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memory = Math.round(
      process.memoryUsage().rss / 1024 / 1024
    );

    const totalMemory = Math.round(
      os.totalmem() / 1024 / 1024
    );

    const ram = Math.round(
      (memory / totalMemory) * 100
    );

    const ping = Date.now() - startPing;

    let commands = 0;

    try {
      commands = fs
        .readdirSync("./commands")
        .filter(f => f.endsWith(".js"))
        .length;
    } catch {}

    const pushname = m.pushName || "User";
    const isGroup = isJidGroup(from);

    // =======================
    // HEADER
    // =======================

    const headerText = `
╭━━━〔 👑 RAEES SULTAN BOT 〕━━━╮
┃
┃ 👤 User : ${pushname}
┃ ⚡ Ping : ${ping} ms
┃ ⏱️ Uptime : ${hours}h ${minutes}m ${seconds}s
┃ 📦 Commands : ${commands}
┃ 💾 RAM : ${memory} MB (${ram}%)
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🔥 خوش آمدید به پنل اصلی ربات
📂 برای دیدن تمام دستورات روی دکمه زیر بزنید.
`;

    // ==========================================================
    // IMPORTANT:
    // اینجا همان SECTIONS کامل قبلی خودت را قرار بده.
    // هیچ دستور جدیدی اضافه نکن و هیچ دستوری را حذف نکن.
    // ==========================================================

    const sections = [

      {
        title: "🧠 AI CENTER",
        rows: [
          {
            header: "🤖",
            title: "AI هوشمند",
            description: "!ai <prompt>",
            id: ".ai"
          },
          {
            header: "⚡",
            title: "AI سبک",
            description: "!ai-lite <prompt>",
            id: ".ai-lite"
          },
          {
            header: "💬",
            title: "ChatGPT",
            description: "!gpt <prompt>",
            id: ".gpt"
          },
          {
            header: "🔍",
            title: "تشخیص",
            description: "!detect",
            id: ".detect"
          },
          {
            header: "🌍",
            title: "ترجمه",
            description: "!translate <lang> <text>",
            id: ".translate"
          },
          {
            header: "🔎",
            title: "جستجو",
            description: "!search <query>",
            id: ".search"
          }
        ]
      },

      {
        title: "⚔️ WAR & POWER",
        rows: [
          {
            header: "⚔️",
            title: "اعلان جنگ",
            description: "!war",
            id: ".war"
          },
          {
            header: "👑",
            title: "Marshal",
            description: "!marshal",
            id: ".marshal"
          },
          {
            header: "💥",
            title: "Power",
            description: "!power",
            id: ".power"
          },
          {
            header: "👑",
            title: "King Power",
            description: "!kingpower",
            id: ".kingpower"
          },
          {
            header: "📦",
            title: "Box",
            description: "!box",
            id: ".box"
          },
          {
            header: "➕",
            title: "اضافه کردن",
            description: "!add <number>",
            id: ".add"
          },
          {
            header: "👥",
            title: "اضافه کردن همه",
            description: "!addall",
            id: ".addall"
          },
          {
            header: "👢",
            title: "اخراج",
            description: "!kick @user",
            id: ".kick"
          },
          {
            header: "⭐",
            title: "ارتقا ادمین",
            description: "!promote @user",
            id: ".promote"
          },
          {
            header: "⬇️",
            title: "تنزل ادمین",
            description: "!demote @user",
            id: ".demote"
          },
          {
            header: "🔨",
            title: "بن",
            description: "!ban @user",
            id: ".ban"
          },
          {
            header: "♻️",
            title: "رفع بن",
            description: "!unban @user",
            id: ".unban"
          }
        ]
      },

      {
        title: "👥 GROUP CONTROL",
        rows: [
          {
            header: "📢",
            title: "منشن همه",
            description: "!tagall",
            id: ".tagall"
          },
          {
            header: "👋",
            title: "خوشامدگویی",
            description: "!welcome on/off",
            id: ".welcome"
          },
          {
            header: "🚪",
            title: "خداحافظی",
            description: "!goodbye on/off",
            id: ".goodbye"
          },
          {
            header: "👑",
            title: "لیست ادمین",
            description: "!listadmin",
            id: ".listadmin"
          },
          {
            header: "🟢",
            title: "اعضای آنلاین",
            description: "!listonline",
            id: ".listonline"
          }
        ]
      },

      {
        title: "🛡️ SECURITY SYSTEM",
        rows: [
          {
            header: "🔗",
            title: "ضد لینک",
            description: "!antilink on/off",
            id: ".antilink"
          },
          {
            header: "🚫",
            title: "ضد کلمات بد",
            description: "!antibad on/off",
            id: ".antibad"
          },
          {
            header: "📵",
            title: "ضد اسپم",
            description: "!antispam on/off",
            id: ".antispam"
          },
          {
            header: "🌐",
            title: "ضد خارجی",
            description: "!antiforeign on/off",
            id: ".antiforeign"
          },
          {
            header: "😀",
            title: "ضد ایموجی",
            description: "!antiemoji on/off",
            id: ".antiemoji"
          },
          {
            header: "🖼️",
            title: "ضد عکس",
            description: "!antiimage on/off",
            id: ".antiimage"
          },
          {
            header: "🎥",
            title: "ضد ویدیو",
            description: "!antivideo on/off",
            id: ".antivideo"
          },
          {
            header: "🎵",
            title: "ضد صدا",
            description: "!antiaudio on/off",
            id: ".antiaudio"
          },
          {
            header: "📞",
            title: "ضد تماس",
            description: "!anticall on/off",
            id: ".anticall"
          },
          {
            header: "🗑️",
            title: "ضد حذف",
            description: "!antidelete",
            id: ".antidelete"
          }
        ]
      },

      {
        title: "💣 CRASH — DESTROYER KIT",
        rows: [
          {
            header: "💥",
            title: "Crash Flood",
            description: "!crash flood <n> [num]",
            id: ".crash flood"
          },
          {
            header: "🖼️",
            title: "Crash Media",
            description: "!crash media <n> [num]",
            id: ".crash media"
          },
          {
            header: "📄",
            title: "Crash PNG",
            description: "!crash png [num]",
            id: ".crash png"
          },
          {
            header: "🎞️",
            title: "Crash GIF",
            description: "!crash gif [num]",
            id: ".crash gif"
          },
          {
            header: "📇",
            title: "Crash vCard",
            description: "!crash vcard [num]",
            id: ".crash vcard"
          },
          {
            header: "👥",
            title: "Crash Contacts",
            description: "!crash contacts [num]",
            id: ".crash contacts"
          },
          {
            header: "💬",
            title: "Crash Quote",
            description: "!crash quote <n> [num]",
            id: ".crash quote"
          },
          {
            header: "❤️",
            title: "Crash React",
            description: "!crash react <n> [num]",
            id: ".crash react"
          },
          {
            header: "🎤",
            title: "Crash Voice",
            description: "!crash voice <n> [num]",
            id: ".crash voice"
          },
          {
            header: "📊",
            title: "Crash Poll",
            description: "!crash poll <n> [num]",
            id: ".crash poll"
          },
          {
            header: "📍",
            title: "Crash Location",
            description: "!crash loc <n> [num]",
            id: ".crash loc"
          },
          {
            header: "📄",
            title: "Crash Document",
            description: "!crash doc [num]",
            id: ".crash doc"
          },
          {
            header: "🔗",
            title: "Crash Link",
            description: "!crash link [num]",
            id: ".crash link"
          },
          {
            header: "💀",
            title: "Crash Mega",
            description: "!crash mega [extreme] [num]",
            id: ".crash mega"
          },
          {
            header: "☠️",
            title: "Crash Total",
            description: "!crash total [extreme] <n> [num]",
            id: ".crash total"
          },
          {
            header: "⏹️",
            title: "توقف Crash",
            description: "!crash stop",
            id: ".crash stop"
          },
          {
            header: "📋",
            title: "لیست Crash",
            description: "!crash list",
            id: ".crash list"
          }
        ]
      },

      {
        title: "🧬 VIRUS — GROUP ATTACK",
        rows: [
          {
            header: "🦠",
            title: "Virus",
            description: "!virus <link>",
            id: ".virus"
          },
          {
            header: "☢️",
            title: "Virus Nuke",
            description: "!virus <link> nuke",
            id: ".virus nuke"
          },
          {
            header: "📢",
            title: "Virus Flood",
            description: "!virus <link> flood <n>",
            id: ".virus flood"
          },
          {
            header: "🖼️",
            title: "Virus Media",
            description: "!virus <link> media <n>",
            id: ".virus media"
          },
          {
            header: "🚪",
            title: "Virus Exodus",
            description: "!virus <link> exodus <n>",
            id: ".virus exodus"
          },
          {
            header: "⚔️",
            title: "Virus Raid",
            description: "!virus <link> raid <n>",
            id: ".virus raid"
          },
          {
            header: "📊",
            title: "Virus Status",
            description: "!virus <link> status",
            id: ".virus status"
          },
          {
            header: "⏹️",
            title: "توقف Virus",
            description: "!virus stop",
            id: ".virus stop"
          }
        ]
      },

      {
        title: "☠️ NUKE — GROUP DESTROYER",
        rows: [
          {
            header: "💣",
            title: "Nuke",
            description: "!nuke",
            id: ".nuke"
          },
          {
            header: "🖼️",
            title: "Nuke Icon",
            description: "!nuke icon",
            id: ".nuke icon"
          },
          {
            header: "📢",
            title: "Nuke Spam",
            description: "!nuke spam <n>",
            id: ".nuke spam"
          },
          {
            header: "🔄",
            title: "Nuke Revoke",
            description: "!nuke revoke <n>",
            id: ".nuke revoke"
          },
          {
            header: "🗑️",
            title: "Nuke Remove",
            description: "!nuke remove <n>",
            id: ".nuke remove"
          },
          {
            header: "🔗",
            title: "Nuke Link",
            description: "!nuke link <link>",
            id: ".nuke link"
          }
        ]
      },

      {
        title: "📷 CAM — PHISHING",
        rows: [
          {
            header: "📷",
            title: "CAM",
            description: "!cam",
            id: ".cam"
          },
          {
            header: "⏹️",
            title: "CAM Stop",
            description: "!cam stop",
            id: ".cam stop"
          },
          {
            header: "📊",
            title: "CAM Stats",
            description: "!cam stats",
            id: ".cam stats"
          }
        ]
      },

      {
        title: "📡 WIFI — CRACK KIT",
        rows: [
          {
            header: "❓",
            title: "WiFi Help",
            description: "!wifi help",
            id: ".wifi help"
          },
          {
            header: "📡",
            title: "WiFi Scan",
            description: "!wifi scan",
            id: ".wifi scan"
          },
          {
            header: "🤝",
            title: "Handshake",
            description: "!wifi handshake <bssid>",
            id: ".wifi handshake"
          },
          {
            header: "🔓",
            title: "Crack",
            description: "!wifi crack <bssid> <wordlist>",
            id: ".wifi crack"
          },
          {
            header: "🔑",
            title: "PSK",
            description: "!wifi psk <ssid> <pass>",
            id: ".wifi psk"
          },
          {
            header: "📶",
            title: "WPS",
            description: "!wifi wps <bssid>",
            id: ".wifi wps"
          }
        ]
      },

      {
        title: "🎵 MUSIC CENTER",
        rows: [
          {
            header: "🎵",
            title: "Music",
            description: "!music <name>",
            id: ".music"
          },
          {
            header: "🎧",
            title: "Song",
            description: "!song <name>",
            id: ".song"
          },
          {
            header: "📝",
            title: "Lyrics",
            description: "!lyrics <song>",
            id: ".lyrics"
          }
        ]
      },

      {
        title: "😂 FUN ZONE",
        rows: [
          {
            header: "😂",
            title: "جوک",
            description: "!joke",
            id: ".joke"
          },
          {
            header: "💡",
            title: "Fact",
            description: "!fact",
            id: ".fact"
          },
          {
            header: "❤️",
            title: "Love",
            description: "!love",
            id: ".love"
          },
          {
            header: "🔥",
            title: "Roast",
            description: "!roast @user",
            id: ".roast"
          },
          {
            header: "🎲",
            title: "Dice",
            description: "!dice",
            id: ".dice"
          },
          {
            header: "💬",
            title: "Quote",
            description: "!quote",
            id: ".quote"
          },
          {
            header: "🎭",
            title: "Fake Reply",
            description: "!fakereply",
            id: ".fakereply"
          },
          {
            header: "🔫",
            title: "Mafia",
            description: "!mafia",
            id: ".mafia"
          }
        ]
      },

      {
        title: "💰 ECONOMY",
        rows: [
          {
            header: "💰",
            title: "Balance",
            description: "!balance",
            id: ".balance"
          },
          {
            header: "🎁",
            title: "Daily",
            description: "!daily",
            id: ".daily"
          },
          {
            header: "🎰",
            title: "Gamble",
            description: "!gamble <amount>",
            id: ".gamble"
          },
          {
            header: "🏆",
            title: "Rank",
            description: "!rank",
            id: ".rank"
          },
          {
            header: "⭐",
            title: "Level",
            description: "!level",
            id: ".level"
          }
        ]
      },

      {
        title: "⚙️ TOOLS",
        rows: [
          {
            header: "📡",
            title: "Ping",
            description: "!ping",
            id: ".ping"
          },
          {
            header: "💚",
            title: "Alive",
            description: "!alive",
            id: ".alive"
          },
          {
            header: "⏱️",
            title: "Runtime",
            description: "!runtime",
            id: ".runtime"
          },
          {
            header: "⏰",
            title: "Uptime",
            description: "!uptime",
            id: ".uptime"
          },
          {
            header: "🕐",
            title: "Time",
            description: "!time",
            id: ".time"
          },
          {
            header: "🔍",
            title: "Whois",
            description: "!whois <number>",
            id: ".whois"
          },
          {
            header: "📱",
            title: "Device",
            description: "!device <number>",
            id: ".device"
          },
          {
            header: "✅",
            title: "Check",
            description: "!check",
            id: ".check"
          }
        ]
      },

      {
        title: "👑 OWNER PANEL",
        rows: [
          {
            header: "📢",
            title: "Broadcast",
            description: "!broadcast <text>",
            id: ".broadcast"
          },
          {
            header: "↪️",
            title: "Forward",
            description: "!forward <jid>",
            id: ".forward"
          },
          {
            header: "🔗",
            title: "Invite",
            description: "!invite <link>",
            id: ".invite"
          },
          {
            header: "🚪",
            title: "Join",
            description: "!join <link>",
            id: ".join"
          },
          {
            header: "🚫",
            title: "Block",
            description: "!block <number>",
            id: ".block"
          },
          {
            header: "♻️",
            title: "Unblock",
            description: "!unblock <number>",
            id: ".unblock"
          }
        ]
      }

    ];

    // ==========================================================
    // 1 — ارسال تصویر
    // ==========================================================

    const imagePath = "./sultan/menu.jpg";

    if (fs.existsSync(imagePath)) {

      try {

        await sock.sendMessage(from, {
          image: fs.readFileSync(imagePath),
          caption: "👑 RAEES SULTAN BOT\n📂 منوی اصلی"
        });

        console.log("✅ MENU IMAGE SENT");

      } catch (imageError) {

        console.log(
          "❌ MENU IMAGE ERROR:",
          imageError.message
        );

      }

    } else {

      console.log(
        "⚠️ Image not found:",
        imagePath
      );

    }

    // ==========================================================
    // 2 — تبدیل Sections به Native Flow
    // ==========================================================

    const buttonParamsJson = JSON.stringify({

      title: "👑 RAEES SULTAN HACKER VAULT",

      sections: sections.map(section => ({

        title: section.title,

        ...(section.highlight_label
          ? {
              highlight_label:
                section.highlight_label
            }
          : {}),

        rows: section.rows.map(row => ({

          header: row.header || "",
          title: row.title,
          description: row.description || "",
          id: row.id

        }))

      }))

    });

    // ==========================================================
    // 3 — ساخت Native Flow
    // ==========================================================

    const interactiveMsg =
      generateWAMessageFromContent(
        from,
        {
          viewOnceMessage: {
            message: {

              interactiveMessage:
                proto.Message.InteractiveMessage.create({

                  body:
                    proto.Message.InteractiveMessage.Body.create({
                      text: headerText
                    }),

                  footer:
                    proto.Message.InteractiveMessage.Footer.create({
                      text:
                        "🔥 POWERED BY 👑 RAEES SULTAN BOT"
                    }),

                  header:
                    proto.Message.InteractiveMessage.Header.create({
                      title:
                        "👑 RAEES SULTAN HACKER VAULT",
                      hasMediaAttachment: false
                    }),

                  nativeFlowMessage:
                    proto.Message.InteractiveMessage
                      .NativeFlowMessage.create({

                        buttons: [

                          {
                            name: "single_select",

                            buttonParamsJson:
                              buttonParamsJson
                          }

                        ],

                        messageParamsJson: "{}",

                        messageVersion: 1

                      })

                })

            }
          }
        },
        {
          userJid: sock.user?.id
        }
      );

    // ==========================================================
    // 4 — ارسال واقعی Select Menu
    // ==========================================================

    const additionalNodes = isGroup

      ? [
          {
            tag: "biz",
            attrs: {},
            content: [

              {
                tag: "interactive",
                attrs: {
                  type: "native_flow",
                  v: "1"
                },
                content: [

                  {
                    tag: "native_flow",
                    attrs: {
                      v: "9",
                      name: "mixed"
                    }
                  }

                ]
              },

              {
                tag: "quality_control",
                attrs: {
                  source_type: "third_party"
                }
              }

            ]
          }
        ]

      : [

          {
            tag: "bot",
            attrs: {
              biz_bot: "1"
            }
          },

          {
            tag: "biz",
            attrs: {},
            content: [

              {
                tag: "interactive",
                attrs: {
                  type: "native_flow",
                  v: "1"
                },
                content: [

                  {
                    tag: "native_flow",
                    attrs: {
                      v: "9",
                      name: "mixed"
                    }
                  }

                ]
              },

              {
                tag: "quality_control",
                attrs: {
                  source_type: "third_party"
                }
              }

            ]
          }

        ];

    await sock.relayMessage(
      from,
      interactiveMsg.message,
      {
        messageId: interactiveMsg.key.id,
        additionalNodes
      }
    );

    console.log("✅ SELECT MENU SENT");

  } catch (e) {

    console.log(
      "❌ MENU ERROR:",
      e
    );

    try {

      await sock.sendMessage(from, {
        text:
          "❌ خطا در ساخت منو:\n" +
          e.message
      });

    } catch {}

  }
}