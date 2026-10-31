import { getDB, saveDB } from "../lib/db.js";

// ==========================
// دستور اصلی
// ==========================
export default async function watch(sock, from, body, m, args) {
  const db = getDB();
  const owners = db.users || [];
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  if (!owners.includes(sender) && !owners.includes(senderNum)) {
    return sock.sendMessage(from, { text: "⛔ فقط مالک ربات." }, { quoted: m });
  }

  db.watch ??= [];

  const sub = (args[0] || "").toLowerCase();

  if (sub === "add") {
    const word = args.slice(1).join(" ").toLowerCase().trim();
    if (!word) return sock.sendMessage(from, { text: "استفاده: .watch add کلمه" }, { quoted: m });
    if (db.watch.includes(word)) return sock.sendMessage(from, { text: "⚠️ قبلاً اضافه شده." }, { quoted: m });
    db.watch.push(word);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ اضافه شد: *${word}*` }, { quoted: m });
  }

  if (sub === "del") {
    const word = args.slice(1).join(" ").toLowerCase().trim();
    const idx = db.watch.indexOf(word);
    if (idx === -1) return sock.sendMessage(from, { text: "❌ پیدا نشد." }, { quoted: m });
    db.watch.splice(idx, 1);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حذف شد: *${word}*` }, { quoted: m });
  }

  if (sub === "list") {
    if (!db.watch.length) return sock.sendMessage(from, { text: "📋 لیست خالیه." }, { quoted: m });
    return sock.sendMessage(from, {
      text: `📋 *کلمات تحت نظر:*\n\n${db.watch.map((w, i) => `${i + 1}. ${w}`).join("\n")}`
    }, { quoted: m });
  }

  if (sub === "clear") {
    db.watch = [];
    saveDB(db);
    return sock.sendMessage(from, { text: "🧹 لیست پاک شد." }, { quoted: m });
  }

  return sock.sendMessage(from, {
    text: `📌 *ردیاب کلمات:*\n\n.watch add کلمه\n.watch del کلمه\n.watch list\n.watch clear`
  }, { quoted: m });
}

// ==========================
// چک هر پیام — handler صدا می‌زنه
// ==========================
export async function checkWatch(sock, from, body, m) {
  try {
    const db = getDB();
    const watchList = db.watch || [];
    if (!watchList.length) return false;

    const text = (body || "").toLowerCase();
    const sender = m.key.participant || from;
    const senderNum = sender.split("@")[0];

    // خود مالک نباشه
    const owners = db.users || [];
    if (owners.includes(sender) || owners.includes(senderNum)) return false;

    const found = [];
    for (const word of watchList) {
      if (text.includes(word)) found.push(word);
    }
    if (!found.length) return false;

    // اسم گروه
    let groupName = from;
    if (from.endsWith("@g.us")) {
      try {
        const meta = await sock.groupMetadata(from);
        groupName = meta.subject || from;
      } catch {}
    } else {
      groupName = "پیوی";
    }

    const alertText =
      `🚨 *کلمه تحت نظر پیدا شد!*\n\n` +
      `👥 گروه: ${groupName}\n` +
      `👤 فرستنده: ${senderNum}\n` +
      `📝 پیام: ${body}\n` +
      `🔍 کلمات: ${found.join(", ")}`;

    for (const owner of owners) {
      const jid = owner.includes("@") ? owner : owner + "@s.whatsapp.net";
      if (jid === sender) continue;
      try {
        await sock.sendMessage(jid, { text: alertText });
      } catch (e) {
        console.log("WATCH ALERT ERROR:", e.message);
      }
    }

    return false;
  } catch (e) {
    console.log("WATCH CHECK ERROR:", e.message);
    return false;
  }
}