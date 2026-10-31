import { getDB, saveDB } from "../lib/db.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";

export default async function capsule(sock, from, body, m, args) {
  const db = getDB();
  db.capsules ??= [];
  const sender = m.key.participant || from;

  const cmd = args[0]?.toLowerCase();

  // لیست کپسول‌ها
  if (cmd === "list") {
    const myCapsules = db.capsules.filter(c => c.from === from && c.sender === sender);
    if (!myCapsules.length) return sock.sendMessage(from, { text: "📭 کپسولی نداری." }, { quoted: m });

    let txt = "⏳ *کپسول‌های زمان شما:*\n\n";
    myCapsules.forEach(c => {
      txt += `🔹 *#${c.id}* | ${new Date(c.sendAt).toLocaleString("fa-IR")}\n└─ ${c.type === 'voice' ? '🎙️ ویس' : '📝 متن'}: ${c.text ? c.text.slice(0,20) : ''}...\n\n`;
    });
    return sock.sendMessage(from, { text: txt }, { quoted: m });
  }

  // لغو کپسول
  if (cmd === "cancel") {
    const id = args[1];
    const idx = db.capsules.findIndex(c => c.id === id && c.sender === sender);
    if (idx === -1) return sock.sendMessage(from, { text: "❌ کپسول پیدا نشد." }, { quoted: m });
    
    const c = db.capsules[idx];
    if (c.mediaPath && fs.existsSync(c.mediaPath)) fs.unlinkSync(c.mediaPath);
    db.capsules.splice(idx, 1);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ کپسول *#${id}* لغو شد.` }, { quoted: m });
  }

  // ساخت کپسول (متن یا ویس)
  const input = args.join(" ");
  if (!input.includes("|")) {
    return sock.sendMessage(from, { text: "📌 استفاده: !capsule 10m | متن پیام\n!capsule 2h | (ریپلای روی ویس)" }, { quoted: m });
  }

  const [timeStr, text] = input.split("|").map(s => s.trim());
  const match = timeStr.match(/^(\d+)([mhd])$/);
  if (!match) return sock.sendMessage(from, { text: "❌ فرمت زمان اشتباهه (مثلا 10m یا 2h)." });

  const ms = { m: 60000, h: 3600000, d: 86400000 }[match[2]];
  const sendAt = Date.now() + (parseInt(match[1]) * ms);
  const id = Date.now().toString().slice(-4);

  let mediaPath = null;
  let type = "text";

  // چک کردن اینکه آیا روی یک ویس ریپلای شده یا نه
  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quotedMsg?.audioMessage) {
    try {
      const buffer = await downloadMediaMessage(
        { message: quotedMsg, key: m.message.extendedTextMessage.contextInfo.stanzaId ? { id: m.message.extendedTextMessage.contextInfo.stanzaId, remoteJid: from } : m.key },
        "buffer", {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage }
      );
      mediaPath = `./database/capsule_${id}.mp3`;
      fs.writeFileSync(mediaPath, buffer);
      type = "voice";
    } catch (e) { console.log("CAPSULE VOICE ERR:", e.message); }
  }

  db.capsules.push({ id, from, sender, text, type, mediaPath, sendAt });
  saveDB(db);

  return sock.sendMessage(from, { 
    text: `✅ کپسول *#${id}* ثبت شد!\n⏱️ ارسال در: ${new Date(sendAt).toLocaleString("fa-IR")}\n📦 نوع: ${type === 'voice' ? 'پیام صوتی 🎙️' : 'متن 📝'}\n\nبرای لغو: !capsule cancel ${id}` 
  }, { quoted: m });
}