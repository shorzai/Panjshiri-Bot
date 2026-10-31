import { getDB, saveDB } from "../lib/db.js";

export default async function confess(sock, from, body, m, args) {
  const db = getDB();
  const owners = db.users || [];
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  // ─── تنظیم گروه ───
  if (args[0] === "setconfess") {
    if (!owners.includes(senderNum)) return;
    db.confessTarget = from;
    saveDB(db);
    return sock.sendMessage(from, { text: "✅ این گروه مقصد اعترافات شد." }, { quoted: m });
  }

  if (args[0] === "stats") {
    db.confessStats ??= {};
    const total = Object.values(db.confessStats).reduce((a, b) => a + b, 0);
    return sock.sendMessage(from, { text: `📊 مجموع اعترافات ارسال شده: ${total}` }, { quoted: m });
  }

  // ─── ارسال اعتراف ───
  if (!from.endsWith("@g.us")) {
    const text = args.join(" ");
    if (!text) return sock.sendMessage(from, { text: "📌 متن اعتراف رو بنویس: !confess من...\n\n💡 برای جواب دادن به اعتراف، روی پیام ربات ریپلای کن و بنویس !reply [متن]" }, { quoted: m });

    const target = db.confessTarget;
    if (!target) return sock.sendMessage(from, { text: "❌ ادمین هنوز گروهی رو تنظیم نکرده." }, { quoted: m });

    db.confessStats ??= {};
    db.confessStats[senderNum] = (db.confessStats[senderNum] || 0) + 1;
    saveDB(db);

    const confId = Date.now().toString().slice(-4);
    const msg = `🕵️‍♂️ *اعتراف ناشناس #${confId}*\n\n"${text}"\n\n↩️ برای جواب دادن به این اعتراف، روی همین پیام ریپلای کنید و بنویسید:\n!reply متن شما`;

    await sock.sendMessage(target, { text: msg });
    await sock.sendMessage(from, { text: `✅ اعتراف *#${confId}* ارسال شد.` }, { quoted: m });
    return;
  }

  // ─── جواب دادن به اعتراف (وقتی توی گروه ریپلای میشه) ───
  if (from.endsWith("@g.us") && args[0] === "reply") {
    const ctx = m.message?.extendedTextMessage?.contextInfo;
    const quotedText = ctx?.quotedMessage?.conversation || ctx?.quotedMessage?.extendedTextMessage?.text;
    
    if (!quotedText || !quotedText.includes("اعتراف ناشناس #")) {
      return sock.sendMessage(from, { text: "❌ باید روی یک پیام اعتراف ناشناس ریپلای کنی." }, { quoted: m });
    }

    const confId = quotedText.match(/#(\d{4})/)[1];
    const replyText = args.slice(1).join(" ");
    if (!replyText) return sock.sendMessage(from, { text: "متن جوابت رو بنویس." });

    // در این نسخه، جواب‌ها توی همون گروه با شماره اعتراف فرستاده میشن (چون آیدی فرستنده اصلی ناشناسه)
    await sock.sendMessage(from, { text: `↩️ *جواب به اعتراف #${confId}:*\n\n"${replyText}"\n\n— ناشناس` }, { quoted: m });
    return;
  }
}