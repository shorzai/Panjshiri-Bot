import { getDB, saveDB } from "../lib/db.js";

// ==========================
// ساختار پیش‌فرض
// ==========================
function ensureConfig(db) {
  db.watchCfg ??= {
    enabled: true,
    mode: "contains",       // contains | exact | starts | ends | regex
    caseSensitive: false,
    notify: "owner",        // owner | group | both | quiet
    autoDelete: false,
    cooldown: 30000,        // 30 ثانیه
    ignoreAdmins: false,
    words: [],              // [{ word, category, addedBy, addedAt }]
    whitelist: [],          // jids که نادیده گرفته می‌شن
    stats: {},              // { word: count }
    history: [],            // [{ word, sender, group, text, time }]
    lastAlert: {}           // cooldown tracker
  };
  return db.watchCfg;
}

// ==========================
// بررسی تطبیق
// ==========================
function matches(text, word, mode, caseSensitive) {
  const t = caseSensitive ? text : text.toLowerCase();
  const w = caseSensitive ? word : word.toLowerCase();

  try {
    switch (mode) {
      case "exact":  return t.trim() === w;
      case "starts": return t.startsWith(w);
      case "ends":   return t.endsWith(w);
      case "regex":  return new RegExp(word, caseSensitive ? "" : "i").test(text);
      case "contains":
      default:       return t.includes(w);
    }
  } catch {
    return false;
  }
}

// ==========================
// دستور اصلی
// ==========================
export default async function watch(sock, from, body, m, args) {
  const db = getDB();
  const cfg = ensureConfig(db);
  const owners = db.users || [];
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  if (!owners.includes(sender) && !owners.includes(senderNum)) {
    return sock.sendMessage(from, { text: "⛔ فقط مالک ربات." }, { quoted: m });
  }

  const sub = (args[0] || "").toLowerCase();
  const rest = args.slice(1);
  const fullRest = rest.join(" ").trim();

  // منشن یا شماره
  const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  let targetJid = mentioned?.[0];
  if (!targetJid && rest[0] && /^\d{8,}$/.test(rest[0].replace(/[^0-9]/g, ""))) {
    targetJid = rest[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  }

  // ============ on/off ============
  if (sub === "on")  { cfg.enabled = true;  saveDB(db); return sock.sendMessage(from, { text: "✅ ردیاب فعال شد." }, { quoted: m }); }
  if (sub === "off") { cfg.enabled = false; saveDB(db); return sock.sendMessage(from, { text: "❌ ردیاب خاموش شد." }, { quoted: m }); }

  // ============ add [category] word ============
  if (sub === "add") {
    if (!fullRest) {
      return sock.sendMessage(from, { text: "استفاده:\n`.watch add کلمه`\n`.watch add [دسته] کلمه`" }, { quoted: m });
    }

    let category = "default";
    let word = fullRest;

    // اگه با [دسته] شروع شده
    const catMatch = fullRest.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (catMatch) {
      category = catMatch[1].trim();
      word = catMatch[2].trim();
    }

    if (cfg.words.some(w => w.word === word && w.category === category)) {
      return sock.sendMessage(from, { text: `⚠️ کلمه *${word}* توی دسته *${category}* قبلاً اضافه شده.` }, { quoted: m });
    }

    cfg.words.push({ word, category, addedBy: sender, addedAt: Date.now() });
    saveDB(db);

    return sock.sendMessage(from, {
      text: `✅ اضافه شد:\n📝 کلمه: *${word}*\n🏷️ دسته: *${category}*\n📊 حالت: ${cfg.mode}`
    }, { quoted: m });
  }

  // ============ del word ============
  if (sub === "del") {
    if (!fullRest) return sock.sendMessage(from, { text: "استفاده: `.watch del کلمه`" }, { quoted: m });
    const idx = cfg.words.findIndex(w => w.word === fullRest);
    if (idx === -1) return sock.sendMessage(from, { text: "❌ پیدا نشد." }, { quoted: m });
    cfg.words.splice(idx, 1);
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حذف شد: *${fullRest}*` }, { quoted: m });
  }

  // ============ clear ============
  if (sub === "clear") {
    cfg.words = [];
    saveDB(db);
    return sock.sendMessage(from, { text: "🧹 همه کلمات پاک شد." }, { quoted: m });
  }

  // ============ list [category] ============
  if (sub === "list") {
    if (!cfg.words.length) {
      return sock.sendMessage(from, { text: "📋 لیست خالیه." }, { quoted: m });
    }

    let list = cfg.words;
    if (fullRest) {
      list = cfg.words.filter(w => w.category === fullRest);
      if (!list.length) return sock.sendMessage(from, { text: `❌ دسته *${fullRest}* خالیه.` }, { quoted: m });
    }

    // گروه‌بندی بر اساس دسته
    const grouped = {};
    list.forEach(w => {
      grouped[w.category] ??= [];
      grouped[w.category].push(w.word);
    });

    let text = `📋 *کلمات تحت نظر* (${list.length})\n\n`;
    for (const [cat, words] of Object.entries(grouped)) {
      text += `🏷️ *${cat}:*\n`;
      words.forEach((w, i) => text += `  ${i + 1}. ${w}\n`);
      text += `\n`;
    }
    text += `📊 حالت تطبیق: *${cfg.mode}*\n`;
    text += `📢 اطلاع‌رسانی: *${cfg.notify}*`;

    return sock.sendMessage(from, { text }, { quoted: m });
  }

  // ============ mode ============
  if (sub === "mode") {
    const mode = rest[0]?.toLowerCase();
    if (!["contains", "exact", "starts", "ends", "regex"].includes(mode)) {
      return sock.sendMessage(from, {
        text: `📌 حالت‌های موجود:\n\n*contains* → شامل کلمه باشه\n*exact* → دقیقاً برابر باشه\n*starts* → با کلمه شروع بشه\n*ends* → با کلمه تموم بشه\n*regex* → الگوی regex`
      }, { quoted: m });
    }
    cfg.mode = mode;
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حالت روی *${mode}* تنظیم شد.` }, { quoted: m });
  }

  // ============ notify ============
  if (sub === "notify") {
    const notify = rest[0]?.toLowerCase();
    if (!["owner", "group", "both", "quiet"].includes(notify)) {
      return sock.sendMessage(from, {
        text: `📌 حالت‌های اطلاع:\n\n*owner* → فقط مالک\n*group* → توی گروه بگه\n*both* → هر دو\n*quiet* → بی‌صدا`
      }, { quoted: m });
    }
    cfg.notify = notify;
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ اطلاع‌رسانی روی *${notify}* تنظیم شد.` }, { quoted: m });
  }

  // ============ autodelete on/off ============
  if (sub === "autodelete") {
    const v = rest[0]?.toLowerCase();
    if (!["on", "off"].includes(v)) {
      return sock.sendMessage(from, { text: "استفاده: `.watch autodelete on/off`" }, { quoted: m });
    }
    cfg.autoDelete = v === "on";
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حذف خودکار: ${cfg.autoDelete ? "🟢 فعال" : "🔴 غیرفعال"}` }, { quoted: m });
  }

  // ============ case on/off ============
  if (sub === "case") {
    const v = rest[0]?.toLowerCase();
    if (!["on", "off"].includes(v)) {
      return sock.sendMessage(from, { text: "استفاده: `.watch case on/off`" }, { quoted: m });
    }
    cfg.caseSensitive = v === "on";
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ حساسیت به حروف: ${cfg.caseSensitive ? "🟢 روشن" : "🔴 خاموش"}` }, { quoted: m });
  }

  // ============ cooldown (ثانیه) ============
  if (sub === "cooldown") {
    const sec = parseInt(rest[0]);
    if (isNaN(sec) || sec < 0) {
      return sock.sendMessage(from, { text: "استفاده: `.watch cooldown 30` (ثانیه)" }, { quoted: m });
    }
    cfg.cooldown = sec * 1000;
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ کول‌داون روی *${sec}* ثانیه تنظیم شد.` }, { quoted: m });
  }

  // ============ ignoreadmins on/off ============
  if (sub === "ignoreadmins") {
    const v = rest[0]?.toLowerCase();
    if (!["on", "off"].includes(v)) {
      return sock.sendMessage(from, { text: "استفاده: `.watch ignoreadmins on/off`" }, { quoted: m });
    }
    cfg.ignoreAdmins = v === "on";
    saveDB(db);
    return sock.sendMessage(from, { text: `✅ نادیده گرفتن ادمین‌ها: ${cfg.ignoreAdmins ? "🟢 فعال" : "🔴 غیرفعال"}` }, { quoted: m });
  }

  // ============ whitelist ============
  if (sub === "whitelist") {
    const action = rest[0]?.toLowerCase();

    if (action === "add") {
      if (!targetJid) {
        return sock.sendMessage(from, { text: "استفاده: `.watch whitelist add @user`" }, { quoted: m });
      }
      if (cfg.whitelist.includes(targetJid)) {
        return sock.sendMessage(from, { text: "قبلاً در لیست سفید بود." }, { quoted: m });
      }
      cfg.whitelist.push(targetJid);
      saveDB(db);
      return sock.sendMessage(from, {
        text: `✅ @${targetJid.split("@")[0]} به لیست سفید اضافه شد.`,
        mentions: [targetJid]
      }, { quoted: m });
    }

    if (action === "del") {
      if (!targetJid) {
        return sock.sendMessage(from, { text: "استفاده: `.watch whitelist del @user`" }, { quoted: m });
      }
      const idx = cfg.whitelist.indexOf(targetJid);
      if (idx === -1) return sock.sendMessage(from, { text: "توی لیست نبود." }, { quoted: m });
      cfg.whitelist.splice(idx, 1);
      saveDB(db);
      return sock.sendMessage(from, {
        text: `✅ @${targetJid.split("@")[0]} از لیست سفید حذف شد.`,
        mentions: [targetJid]
      }, { quoted: m });
    }

    if (action === "list") {
      if (!cfg.whitelist.length) {
        return sock.sendMessage(from, { text: "📋 لیست سفید خالیه." }, { quoted: m });
      }
      return sock.sendMessage(from, {
        text: `✅ *لیست سفید:*\n\n${cfg.whitelist.map(u => `• @${u.split("@")[0]}`).join("\n")}`,
        mentions: cfg.whitelist
      }, { quoted: m });
    }

    if (action === "clear") {
      cfg.whitelist = [];
      saveDB(db);
      return sock.sendMessage(from, { text: "🧹 لیست سفید پاک شد." }, { quoted: m });
    }

    return sock.sendMessage(from, {
      text: "استفاده:\n`.watch whitelist add @user`\n`.watch whitelist del @user`\n`.watch whitelist list`\n`.watch whitelist clear`"
    }, { quoted: m });
  }

  // ============ stats ============
  if (sub === "stats") {
    const entries = Object.entries(cfg.stats || {});
    if (!entries.length) {
      return sock.sendMessage(from, { text: "📊 آماری ثبت نشده." }, { quoted: m });
    }
    entries.sort((a, b) => b[1] - a[1]);
    const lines = entries.slice(0, 15)
      .map(([word, n], i) => `${i + 1}. *${word}* — ${n} بار`)
      .join("\n");

    return sock.sendMessage(from, {
      text: `📊 *آمار کلمات:*\n\n${lines}\n\n📈 مجموع: ${entries.reduce((s, [, n]) => s + n, 0)} بار`
    }, { quoted: m });
  }

  // ============ history ============
  if (sub === "history") {
    if (!cfg.history?.length) {
      return sock.sendMessage(from, { text: "📜 تاریخچه خالیه." }, { quoted: m });
    }

    const lines = cfg.history.slice(0, 15).map(h => {
      const min = Math.floor((Date.now() - h.time) / 60000);
      const ago = min < 60 ? `${min} دقیقه پیش` : `${Math.floor(min / 60)} ساعت پیش`;
      return `• *${h.word}* | @${h.sender.split("@")[0]} | ${ago}\n  └ "${(h.text || "").slice(0, 40)}"`;
    }).join("\n\n");

    const jids = cfg.history.slice(0, 15).map(h => h.sender);

    return sock.sendMessage(from, {
      text: `📜 *آخرین هشدارها:*\n\n${lines}`,
      mentions: [...new Set(jids)]
    }, { quoted: m });
  }

  // ============ reset ============
  if (sub === "reset") {
    cfg.stats = {};
    cfg.history = [];
    cfg.lastAlert = {};
    saveDB(db);
    return sock.sendMessage(from, { text: "🧹 آمار و تاریخچه پاک شد." }, { quoted: m });
  }

  // ============ info / راهنما ============
  if (sub === "info" || sub === "") {
    return sock.sendMessage(from, {
      text:
`📊 *تنظیمات فعلی ردیاب*

🟢 وضعیت: ${cfg.enabled ? "فعال" : "خاموش"}
🎯 حالت: *${cfg.mode}*
📢 اطلاع: *${cfg.notify}*
🗑️ حذف خودکار: ${cfg.autoDelete ? "🟢" : "🔴"}
🔠 حساسیت: ${cfg.caseSensitive ? "🟢" : "🔴"}
⏱️ کول‌داون: ${cfg.cooldown / 1000}s
👑 نادیده ادمین: ${cfg.ignoreAdmins ? "🟢" : "🔴"}
📝 کلمات: ${cfg.words.length}
✅ لیست سفید: ${cfg.whitelist.length}

📖 برای راهنما: *.watch help*`
    }, { quoted: m });
  }

  return sock.sendMessage(from, {
    text:
`📌 *دستورات ردیاب کلمات*

🔧 *پایه:*
.watch on / off
.watch info

📝 *مدیریت کلمات:*
.watch add کلمه
.watch add [دسته] کلمه
.watch del کلمه
.watch list [دسته]
.watch clear

⚙️ *تنظیمات:*
.watch mode contains|exact|starts|ends|regex
.watch notify owner|group|both|quiet
.watch autodelete on/off
.watch case on/off
.watch cooldown 30
.watch ignoreadmins on/off

👥 *لیست سفید:*
.watch whitelist add @user
.watch whitelist del @user
.watch whitelist list

📊 *آمار:*
.watch stats
.watch history
.watch reset`
  }, { quoted: m });
}


// ==========================
// چک هر پیام — handler صدا می‌زنه
// ==========================
export async function checkWatch(sock, from, body, m) {
  try {
    const db = getDB();
    const cfg = db.watchCfg;
    if (!cfg?.enabled || !cfg.words?.length) return false;

    const text = body || "";
    if (!text) return false;

    const sender = m.key.participant || from;
    const senderNum = sender.split("@")[0];

    // لیست سفید
    if (cfg.whitelist?.includes(sender)) return false;

    // مالک ربات نباشه
    const owners = db.users || [];
    if (owners.includes(sender) || owners.includes(senderNum)) return false;

    // ادمین (اگه تنظیم شده)
    if (cfg.ignoreAdmins && from.endsWith("@g.us")) {
      try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(v => v.admin).map(v => v.id);
        if (admins.includes(sender)) return false;
      } catch {}
    }

    // پیدا کردن تطبیق‌ها
    const found = [];
    for (const item of cfg.words) {
      if (matches(text, item.word, cfg.mode, cfg.caseSensitive)) {
        found.push(item);
      }
    }
    if (!found.length) return false;

    // ─── کول‌داون ───
    cfg.lastAlert ??= {};
    const now = Date.now();
    const lastTime = cfg.lastAlert[sender] || 0;
    const cooldown = cfg.cooldown || 30000;

    const words = found.map(f => f.word);
    const categories = [...new Set(found.map(f => f.category))];

    // ثبت آمار (همیشه)
    cfg.stats ??= {};
    cfg.history ??= [];
    for (const f of found) {
      cfg.stats[f.word] = (cfg.stats[f.word] || 0) + 1;
    }
    cfg.history.unshift({
      word: words.join(", "),
      sender,
      group: from,
      text: text.slice(0, 100),
      time: now
    });
    if (cfg.history.length > 50) cfg.history = cfg.history.slice(0, 50);

    // اگه توی کول‌داون بود، فقط ثبت کن، هشدار نده
    if (now - lastTime < cooldown) {
      saveDB(db);
      return false;
    }
    cfg.lastAlert[sender] = now;
    saveDB(db);

    // ─── حذف خودکار ───
    if (cfg.autoDelete) {
      try { await sock.sendMessage(from, { delete: m.key }); } catch {}
    }

    // ─── اسم گروه ───
    let groupName = "پیوی";
    if (from.endsWith("@g.us")) {
      try {
        const meta = await sock.groupMetadata(from);
        groupName = meta.subject || from;
      } catch {}
    }

    // ─── متن هشدار ───
    const alertText =
`🚨 *کلمه تحت نظر!*

👥 گروه: ${groupName}
👤 فرستنده: @${senderNum}
🔍 کلمات: ${words.map(w => `*${w}*`).join(", ")}
🏷️ دسته: ${categories.join(", ")}
📝 پیام: "${text.slice(0, 100)}"`;

    // ─── اطلاع‌رسانی ───
    const notify = cfg.notify || "owner";

    if (notify === "owner" || notify === "both") {
      for (const owner of owners) {
        const jid = owner.includes("@") ? owner : owner + "@s.whatsapp.net";
        if (jid === sender) continue;
        try {
          await sock.sendMessage(jid, {
            text: alertText,
            mentions: [sender]
          });
        } catch (e) {
          console.log("WATCH OWNER ALERT ERROR:", e.message);
        }
      }
    }

    if ((notify === "group" || notify === "both") && from.endsWith("@g.us")) {
      try {
        await sock.sendMessage(from, {
          text: `🚨 @${senderNum} از کلمه تحت نظر استفاده کرد: ${words.join(", ")}`,
          mentions: [sender]
        });
      } catch {}
    }

    return false;  // جلوی پردازش عادی رو نمی‌گیریم

  } catch (e) {
    console.log("WATCH CHECK ERROR:", e.message);
    return false;
  }
}