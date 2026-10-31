import { getDB, saveDB } from "../lib/db.js";

// ============================================
// 📋 لیست پیش‌فرض کلمات ممنوعه
// ============================================
const DEFAULT_BADWORDS = [
  // فارسی
  "احمق", "خنگ", "نفهم", "بی شعور", "بیشعور", "کص", "کیر", "کون",
  "جنده", "حرومی", "خایه", "قحبه", "فاحشه", "هرزه", "لعنتی", "گوه",
  "گوه خور", "گه", "سگ صفت", "مادر جنده", "مادر خراب", "مادر قحبه",
  "پدرسگ", "پدر سگ", "کونی", "کصخل", "کصکش", "کیرم", "کیرم تو",
  "جنده زاده", "حرام زاده", "حرامزاده", "بی ناموس", "بی ناموسی",
  "توله سگ", "خوک", "خوک صفت", "کثافت", "کثافت کاری", "پلید",
  "خیانت کار", "دروغگو", "کلاه بردار", "دزد", "بیشرف", "بی شرف",
  "کصافت", "کصافتکار", "کیری", "کیر تو", "کون تو", "کونکش",
  "مادرکصه", "مادر به خطا", "مادرت", "خواهرت", "ناموست",
  "پفیوز", "پست فطرت", "پست", "خوار", "ذلیل", "احمق زاده",
  "اسکل", "اسکول", "خل و چل", "خل", "دیوانه", "مجنون",
  "خرف", "خرفت", "ابله", "ابلهی", "ساده لوح",
  
  // انگلیسی
  "fuck", "shit", "bitch", "ass", "asshole", "bastard", "damn",
  "dick", "pussy", "cunt", "whore", "slut", "motherfucker",
  "faggot", "retard", "idiot", "stupid", "dumbass", "moron",
  "fuckyou", "fuck you", "son of a bitch", "sob",
];


// ============================================
// 🎯 دستور اصلی — مدیریت کلمات ممنوعه
// ============================================
export default async function badword(sock, from, body, m, args) {
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "فقط در گروه!" }, { quoted: m });
  }

  const db = getDB();
  db.badwords ??= {};
  db.badwords[from] ??= [...DEFAULT_BADWORDS];  // ← لیست پیش‌فرض خودکار

  const sub = (args[0] || "").toLowerCase();

  // ---------- add ----------
  if (sub === "add") {
    const word = args.slice(1).join(" ").toLowerCase().trim();
    if (!word) {
      return sock.sendMessage(from, { text: "استفاده: .badword add کلمه" }, { quoted: m });
    }
    if (db.badwords[from].includes(word)) {
      return sock.sendMessage(from, { text: "⚠️ قبلاً اضافه شده." }, { quoted: m });
    }
    db.badwords[from].push(word);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ اضافه شد: *${word}*` }, { quoted: m });
  }

  // ---------- del ----------
  if (sub === "del") {
    const word = args.slice(1).join(" ").toLowerCase().trim();
    const idx = db.badwords[from].indexOf(word);
    if (idx === -1) {
      return sock.sendMessage(from, { text: "❌ پیدا نشد." }, { quoted: m });
    }
    db.badwords[from].splice(idx, 1);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حذف شد: *${word}*` }, { quoted: m });
  }

  // ---------- list ----------
  if (sub === "list") {
    const list = db.badwords[from];
    if (!list.length) {
      return sock.sendMessage(from, { text: "📋 لیست خالیه." }, { quoted: m });
    }
    const preview = list.slice(0, 50).map((w, i) => `${i + 1}. ${w}`).join("\n");
    const extra = list.length > 50 ? `\n\n... و ${list.length - 50} کلمه دیگر` : "";
    return sock.sendMessage(from, {
      text: `📋 *کلمات ممنوعه (${list.length} کلمه):*\n\n${preview}${extra}`
    }, { quoted: m });
  }

  // ---------- clear ----------
  if (sub === "clear") {
    db.badwords[from] = [];
    saveDB(db);
    return sock.sendMessage(from, { text: "🧹 لیست پاک شد." }, { quoted: m });
  }

  // ---------- reset ----------
  if (sub === "reset") {
    db.badwords[from] = [...DEFAULT_BADWORDS];
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ لیست به حالت پیش‌فرض برگشت (${DEFAULT_BADWORDS.length} کلمه).` }, { quoted: m });
  }

  // ---------- راهنما ----------
  return sock.sendMessage(from, {
    text: `📌 *دستورات کلمات ممنوعه:*\n\n.badword add کلمه\n.badword del کلمه\n.badword list\n.badword clear\n.badword reset\n\n📊 تعداد فعلی: ${db.badwords[from].length} کلمه`
  }, { quoted: m });
}


// ============================================
// 🛡️ چک هر پیام — گروه + پیوی
// ============================================
export async function checkBadWord(sock, from, body, m) {
  try {
    const db = getDB();
    const isGroup = from.endsWith("@g.us");

    // لیست کلمات: در گروه → لیست گروه، در پیوی → لیست پیش‌فرض
    const words = isGroup
      ? db.badwords?.[from]
      : (db.badwords?.["__private__"] || DEFAULT_BADWORDS);

    if (!words?.length) return false;

    const text = (body || "").toLowerCase();
    const found = words.find(w => text.includes(w));
    if (!found) return false;

    const sender = m.key.participant || from;
    const senderNum = sender.split("@")[0];

    // 🚫 چک ادمین (فقط در گروه)
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(v => v.admin).map(v => v.id);
        if (admins.includes(sender)) return false;   // ادمین → هیچ کاری نکن
      } catch (e) {
        console.log("BADWORD ADMIN CHECK:", e.message);
      }
    }

    // 🚫 چک مالک ربات (هم گروه هم پیوی)
    const owners = db.users || [];
    if (owners.includes(sender) || owners.includes(senderNum)) return false;   // مالک → هیچ کاری نکن

    // 🗑️ حذف پیام
    try {
      await sock.sendMessage(from, { delete: m.key });
    } catch (e) {
      console.log("BADWORD DELETE FAILED:", e.message);
    }

    // ⚠️ اخطار (فقط در گروه — در پیوی نیازی نیست)
    if (isGroup) {
      try {
        await sock.sendMessage(from, {
          text: `🚫 @${senderNum}\nاستفاده از کلمه ممنوعه: *${found}*`,
          mentions: [sender]
        });
      } catch (e) {
        console.log("BADWORD WARN ERROR:", e.message);
      }
    }

    return true;

  } catch (e) {
    console.log("BADWORD CHECK ERROR:", e.message);
    return false;
  }
}