import { getDB, saveDB } from "../lib/db.js";

// ==========================
// پارس زمان: 30s, 10m, 24h, 7d
// ==========================
function parseDuration(str) {
  if (!str) return null;
  const m = str.match(/^(\d+)([smhd])$/i);
  if (!m) return null;
  const n = parseInt(m[1]);
  const unit = m[2].toLowerCase();
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return n * ms;
}

function formatDuration(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const parts = [];
  if (d) parts.push(`${d} روز`);
  if (h) parts.push(`${h} ساعت`);
  if (m) parts.push(`${m} دقیقه`);
  return parts.join(" و ") || "چند لحظه";
}

// ==========================
// دستور اصلی
// ==========================
export default async function antireply(sock, from, body, m, args) {
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "فقط در گروه!" }, { quoted: m });
  }

  const db = getDB();
  db.antireply ??= {};
  db.antireply[from] ??= {
    enabled: false,
    mode: "warn",
    users: [],
    trusted: [],
    timers: {},
    stats: {},
    history: []
  };

  const cfg = db.antireply[from];
  const sub = (args[0] || "").toLowerCase();
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  // دریافت کاربر هدف (منشن یا شماره)
  const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let targetJid = mentioned?.[0];
  if (!targetJid && args[1] && /^\d{8,}$/.test(args[1].replace(/[^0-9]/g, ""))) {
    targetJid = args[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  }

  // ============ on/off ============
  if (sub === "on") {
    cfg.enabled = true;
    saveDB(db);
    return sock.sendMessage(from, { text: "✅ ضد ریپلای *فعال* شد." }, { quoted: m });
  }

  if (sub === "off") {
    cfg.enabled = false;
    saveDB(db);
    return sock.sendMessage(from, { text: "❌ ضد ریپلای *خاموش* شد." }, { quoted: m });
  }

  // ============ me (محافظت خود) ============
  if (sub === "me") {
    const dur = parseDuration(args[1]);
    if (!cfg.users.includes(sender)) cfg.users.push(sender);

    if (dur) {
      cfg.timers[sender] = Date.now() + dur;
      saveDB(db);
      return sock.sendMessage(from, {
        text: `🛡️ @${senderNum} برای *${formatDuration(dur)}* محافظت شد.`,
        mentions: [sender]
      }, { quoted: m });
    }

    delete cfg.timers[sender];
    saveDB(db);
    return sock.sendMessage(from, {
      text: `🛡️ @${senderNum} برای همیشه محافظت شد.`,
      mentions: [sender]
    }, { quoted: m });
  }

  if (sub === "meoff") {
    const idx = cfg.users.indexOf(sender);
    if (idx === -1) {
      return sock.sendMessage(from, { text: "شما توی لیست نبودی." }, { quoted: m });
    }
    cfg.users.splice(idx, 1);
    delete cfg.timers[sender];
    saveDB(db);
    return sock.sendMessage(from, { text: "✅ محافظت برداشته شد." }, { quoted: m });
  }

  // ============ protect (توسط ادمین) ============
  if (sub === "protect") {
    if (!targetJid) {
      return sock.sendMessage(from, {
        text: "استفاده: `.antireply protect @user` یا `.antireply protect 989123456789 24h`"
      }, { quoted: m });
    }
    const dur = parseDuration(args[2]);
    if (!cfg.users.includes(targetJid)) cfg.users.push(targetJid);

    if (dur) {
      cfg.timers[targetJid] = Date.now() + dur;
      saveDB(db);
      return sock.sendMessage(from, {
        text: `🛡️ @${targetJid.split("@")[0]} برای *${formatDuration(dur)}* محافظت شد.`,
        mentions: [targetJid]
      }, { quoted: m });
    }

    delete cfg.timers[targetJid];
    saveDB(db);
    return sock.sendMessage(from, {
      text: `🛡️ @${targetJid.split("@")[0]} برای همیشه محافظت شد.`,
      mentions: [targetJid]
    }, { quoted: m });
  }

  if (sub === "unprotect") {
    if (!targetJid) {
      return sock.sendMessage(from, { text: "استفاده: `.antireply unprotect @user`" }, { quoted: m });
    }
    const idx = cfg.users.indexOf(targetJid);
    if (idx === -1) {
      return sock.sendMessage(from, { text: "توی لیست نبود." }, { quoted: m });
    }
    cfg.users.splice(idx, 1);
    delete cfg.timers[targetJid];
    saveDB(db);
    return sock.sendMessage(from, {
      text: `✅ @${targetJid.split("@")[0]} از محافظت خارج شد.`,
      mentions: [targetJid]
    }, { quoted: m });
  }

  // ============ trust (لیست اعتماد) ============
  if (sub === "trust") {
    if (!targetJid) {
      return sock.sendMessage(from, { text: "استفاده: `.antireply trust @user`" }, { quoted: m });
    }
    if (cfg.trusted.includes(targetJid)) {
      return sock.sendMessage(from, { text: "قبلاً در لیست اعتماد بود." }, { quoted: m });
    }
    cfg.trusted.push(targetJid);
    saveDB(db);
    return sock.sendMessage(from, {
      text: `✅ @${targetJid.split("@")[0]} به لیست اعتماد اضافه شد.\n(این کاربر می‌تونه به محافظت‌شده‌ها ریپلای کنه)`,
      mentions: [targetJid]
    }, { quoted: m });
  }

  if (sub === "untrust") {
    if (!targetJid) {
      return sock.sendMessage(from, { text: "استفاده: `.antireply untrust @user`" }, { quoted: m });
    }
    const idx = cfg.trusted.indexOf(targetJid);
    if (idx === -1) {
      return sock.sendMessage(from, { text: "توی لیست اعتماد نبود." }, { quoted: m });
    }
    cfg.trusted.splice(idx, 1);
    saveDB(db);
    return sock.sendMessage(from, {
      text: `✅ @${targetJid.split("@")[0]} از لیست اعتماد حذف شد.`,
      mentions: [targetJid]
    }, { quoted: m });
  }

  // ============ mode ============
  if (sub === "mode") {
    const mode = (args[1] || "").toLowerCase();
    if (!["warn", "delete", "kick"].includes(mode)) {
      return sock.sendMessage(from, {
        text: `📌 حالت‌های موجود:\n\n*delete* → فقط پاک کن\n*warn* → پاک کن + اخطار (پیش‌فرض)\n*kick* → بعد از ۳ بار حذف از گروه`
      }, { quoted: m });
    }
    cfg.mode = mode;
    saveDB(db);
    return sock.sendMessage(from, {
      text: `✅ حالت روی *${mode}* تنظیم شد.`
    }, { quoted: m });
  }

  // ============ list ============
  if (sub === "list") {
    const userLines = cfg.users.length
      ? cfg.users.map(u => {
          const timer = cfg.timers[u];
          const remain = timer && timer > Date.now()
            ? ` (${formatDuration(timer - Date.now())})`
            : timer ? " (منقضی شده)" : "";
          return `• @${u.split("@")[0]}${remain}`;
        }).join("\n")
      : "(خالی)";

    const trustLines = cfg.trusted.length
      ? cfg.trusted.map(u => `• @${u.split("@")[0]}`).join("\n")
      : "(خالی)";

    return sock.sendMessage(from, {
      text:
`🛡️ *تنظیمات ضد ریپلای*

📊 وضعیت: ${cfg.enabled ? "🟢 فعال" : "🔴 غیرفعال"}
🎯 حالت: *${cfg.mode}*

━━━━━━━━━━━━━━
👤 *کاربران محافظت‌شده:*
${userLines}

✅ *لیست اعتماد:*
${trustLines}`,
      mentions: [...cfg.users, ...cfg.trusted]
    }, { quoted: m });
  }

  // ============ stats ============
  if (sub === "stats") {
    const entries = Object.entries(cfg.stats || {});
    if (!entries.length) {
      return sock.sendMessage(from, { text: "📊 هیچ تخلفی ثبت نشده." }, { quoted: m });
    }
    entries.sort((a, b) => b[1] - a[1]);
    const lines = entries.slice(0, 10)
      .map(([jid, n], i) => `${i + 1}. @${jid.split("@")[0]} — *${n}* بار`)
      .join("\n");

    return sock.sendMessage(from, {
      text: `📊 *آمار تخلفات:*\n\n${lines}`,
      mentions: entries.slice(0, 10).map(([jid]) => jid)
    }, { quoted: m });
  }

  // ============ history ============
  if (sub === "history") {
    if (!cfg.history?.length) {
      return sock.sendMessage(from, { text: "📜 تاریخچه خالیه." }, { quoted: m });
    }
    const lines = cfg.history.slice(0, 10).map(h => {
      const ago = Math.floor((Date.now() - h.time) / 60000);
      return `• @${h.sender.split("@")[0]} → @${h.target.split("@")[0]}\n  ${ago} دقیقه پیش | "${(h.text || "").slice(0, 30)}"`;
    }).join("\n\n");

    return sock.sendMessage(from, {
      text: `📜 *آخرین تخلفات:*\n\n${lines}`,
      mentions: cfg.history.slice(0, 10).flatMap(h => [h.sender, h.target])
    }, { quoted: m });
  }

  // ============ reset ============
  if (sub === "reset") {
    cfg.stats = {};
    cfg.history = [];
    saveDB(db);
    return sock.sendMessage(from, { text: "🧹 آمار و تاریخچه پاک شد." }, { quoted: m });
  }

  // ============ راهنما ============
  return sock.sendMessage(from, {
    text:
`📌 *دستورات ضد ریپلای*

🛡️ *پایه:*
.antireply on / off
.antireply me [24h]
.antireply meoff

👑 *مدیریت (ادمین):*
.antireply protect @user [24h]
.antireply unprotect @user
.antireply trust @user
.antireply untrust @user

⚙️ *تنظیمات:*
.antireply mode warn|delete|kick
.antireply list
.antireply stats
.antireply history
.antireply reset`
  }, { quoted: m });
}


// ==========================
// چک هر پیام
// ==========================
export async function checkAntiReply(sock, from, body, m) {
  try {
    if (!from.endsWith("@g.us")) return false;

    const db = getDB();
    const cfg = db.antireply?.[from];
    if (!cfg?.enabled) return false;

    // پاک‌سازی تایمرهای منقضی
    let changed = false;
    for (const [jid, expiry] of Object.entries(cfg.timers || {})) {
      if (Date.now() > expiry) {
        cfg.users = cfg.users.filter(u => u !== jid);
        delete cfg.timers[jid];
        changed = true;
      }
    }
    if (changed) saveDB(db);

    if (!cfg.users?.length) return false;

    const ctx =
      m.message?.extendedTextMessage?.contextInfo ||
      m.message?.imageMessage?.contextInfo ||
      m.message?.videoMessage?.contextInfo ||
      m.message?.stickerMessage?.contextInfo ||
      m.message?.audioMessage?.contextInfo ||
      m.message?.documentMessage?.contextInfo;

    if (!ctx?.participant) return false;

    const repliedTo = ctx.participant;
    if (!cfg.users.includes(repliedTo)) return false;

    const sender = m.key.participant || from;
    if (sender === repliedTo) return false;

    // لیست اعتماد
    if (cfg.trusted?.includes(sender)) return false;

    // ادمین
    const meta = await sock.groupMetadata(from);
    const admins = meta.participants.filter(v => v.admin).map(v => v.id);
    if (admins.includes(sender)) return false;

    // مالک
    const owners = db.users || [];
    const senderNum = sender.split("@")[0];
    if (owners.includes(sender) || owners.includes(senderNum)) return false;

    // ─── تخلف! ───
    try { await sock.sendMessage(from, { delete: m.key }); } catch {}

    // ثبت تاریخچه
    cfg.history ??= [];
    cfg.history.unshift({
      sender,
      target: repliedTo,
      time: Date.now(),
      text: (body || "").slice(0, 100)
    });
    if (cfg.history.length > 20) cfg.history = cfg.history.slice(0, 20);

    // آمار
    cfg.stats ??= {};
    cfg.stats[sender] = (cfg.stats[sender] || 0) + 1;
    const violations = cfg.stats[sender];

    saveDB(db);

    const protectedNum = repliedTo.split("@")[0];

    // 🔔 اطلاع به کاربر محافظت‌شده (پیوی)
    try {
      await sock.sendMessage(repliedTo, {
        text:
`🔔 *اطلاعیه امنیتی*

@${senderNum} سعی کرد به پیامت ریپلای کنه، ولی ربات جلوش رو گرفت.

📝 متن ارسالی: "${(body || "").slice(0, 80)}"

⚠️ این کاربر تا الان ${violations} بار تخلف کرده.`
      });
    } catch {}

    // حالت
    const mode = cfg.mode || "warn";

    if (mode === "warn") {
      await sock.sendMessage(from, {
        text: `🚫 @${senderNum}\nریپلای به @${protectedNum} ممنوعه!\n\n⚠️ اخطار: ${violations}/3`,
        mentions: [sender, repliedTo]
      });
    } else if (mode === "kick" && violations >= 3) {
      await sock.sendMessage(from, {
        text: `🚫 @${senderNum} به دلیل تکرار ریپلای به کاربر محافظت‌شده حذف شد.`,
        mentions: [sender]
      });
      try {
        await sock.groupParticipantsUpdate(from, [sender], "remove");
      } catch (e) {
        console.log("ANTIREPLY REMOVE FAILED:", e.message);
      }
      delete cfg.stats[sender];
      saveDB(db);
    }
    // mode === "delete" → فقط سایلنت پاک میشه

    return true;

  } catch (e) {
    console.log("ANTIREPLY CHECK ERROR:", e.message);
    return false;
  }
}