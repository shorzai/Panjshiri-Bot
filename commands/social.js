import { getDB, saveDB } from "../lib/db.js";

// ==========================
// دستور اصلی
// ==========================
export default async function social(sock, from, body, m, args) {
  try {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "فقط در گروه!" }, { quoted: m });
    }

    const db = getDB();
    const data = db.social?.[from];

    if (!data || !Object.keys(data).length) {
      return sock.sendMessage(from, {
        text: "📊 هنوز داده‌ای نیست.\nباید اعضا به هم ریپلای کنن تا شبکه شکل بگیره."
      }, { quoted: m });
    }

    // محاسبه جفت‌ها
    const pairs = [];
    const seen = new Set();

    for (const [a, targets] of Object.entries(data)) {
      for (const [b, count] of Object.entries(targets)) {
        const key = [a, b].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);

        const reverse = data[b]?.[a] || 0;
        const total = count + reverse;

        if (total < 2) continue;

        pairs.push({ a, b, total, aToB: count, bToA: reverse });
      }
    }

    if (!pairs.length) {
      return sock.sendMessage(from, {
        text: "📊 هنوز تعامل کافی نیست."
      }, { quoted: m });
    }

    pairs.sort((x, y) => y.total - x.total);
    const top10 = pairs.slice(0, 10);

    let text = `🕸️ *شبکه اجتماعی گروه*\n\n`;
    text += `📊 تعداد جفت‌های تعاملی: ${pairs.length}\n\n━━━━━━━━━━━━━━\n\n`;

    top10.forEach((p, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
      text += `${medal} @${p.a.split("@")[0]} ↔ @${p.b.split("@")[0]}\n`;
      text += `   └─ ${p.total} ریپلای\n\n`;
    });

    const allJids = new Set();
    top10.forEach(p => { allJids.add(p.a); allJids.add(p.b); });

    await sock.sendMessage(from, {
      text,
      mentions: [...allJids]
    }, { quoted: m });

  } catch (e) {
    console.log("SOCIAL ERROR:", e);
    sock.sendMessage(from, { text: "❌ خطا: " + e.message }, { quoted: m });
  }
}

// ==========================
// ثبت ریپلای — handler صدا می‌زنه
// ==========================
export function trackSocial(from, m) {
  try {
    if (!from.endsWith("@g.us")) return;

    const ctx =
      m.message?.extendedTextMessage?.contextInfo ||
      m.message?.imageMessage?.contextInfo ||
      m.message?.videoMessage?.contextInfo ||
      m.message?.audioMessage?.contextInfo ||
      m.message?.stickerMessage?.contextInfo;

    if (!ctx?.participant) return;

    const replier = m.key.participant || from;
    const replied = ctx.participant;

    if (replier === replied) return;

    const db = getDB();
    db.social ??= {};
    db.social[from] ??= {};
    db.social[from][replier] ??= {};
    db.social[from][replier][replied] =
      (db.social[from][replier][replied] || 0) + 1;

    saveDB(db);
  } catch (e) {
    console.log("TRACK SOCIAL ERROR:", e.message);
  }
}