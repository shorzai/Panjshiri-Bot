// =======================
// OTP.JS — شماره مجازی + دریافت کد OTP
// پشتیبانی: 5sim.net | sms-activate.org
//
//   !otp rent <سرویس> [provider] [کشور] [اپراتور]
//   !otp check [orderId]
//   !otp cancel [orderId]
//   !otp finish [orderId]
//   !otp stop [orderId]
//   !otp list
//   !otp countries | !otp services | !otp help
// =======================

import fs from "fs";
import path from "path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- تنظیمات (otp-config.json کنار بات) ----------
const CFG_FILE = path.join(process.cwd(), "otp-config.json");
const KEYS = {
  "5sim": process.env.OTP_5SIM || "",
  activate: process.env.OTP_ACTIVATE || "",
};
try {
  if (fs.existsSync(CFG_FILE))
    Object.assign(KEYS, JSON.parse(fs.readFileSync(CFG_FILE, "utf8")));
} catch (e) {
  console.log("OTP CFG ERROR:", e.message);
}

// ---------- fetch با تایم‌اوت ----------
async function fetchT(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------- سفارش‌های فعال ----------
const orders = new Map(); // id -> {provider, phone, chat, product, timer, startedAt, sent, done}

function stopPoll(order) {
  if (order.timer) {
    clearInterval(order.timer);
    order.timer = null;
  }
}

function startPoll(sock, order) {
  if (order.timer) return;
  const iv = setInterval(async () => {
    if (order.done) {
      clearInterval(iv);
      return;
    }
    try {
      let smsList = [];
      if (order.provider === "5sim") {
        const j = await s5Check(order.id);
        smsList = j.sms || [];
      } else {
        const st = await actStatus(order.id);
        if (st.startsWith("STATUS_OK")) {
          const code = st.split(":")[1] || "";
          smsList = [{ id: "ok", text: "کد تأیید: " + code, code, sender: "sms-activate" }];
          order.done = true;
        } else if (st === "STATUS_CANCEL") {
          order.done = true;
          clearInterval(iv);
          await sock
            .sendMessage(order.chat, { text: `❌ سفارش ${order.id} کنسل شد.` })
            .catch(() => {});
          return;
        }
      }

      for (const s of smsList) {
        const key = s.id || s.text + s.created_at;
        if (order.sent.has(key)) continue;
        order.sent.add(key);
        const code =
          s.code || (String(s.text || "").match(/\b\d{4,8}\b/) || [null, ""])[1] || "؟";
        const txt =
          `📩 کد جدید دریافت شد!\n\n` +
          `📱 شماره: ${order.phone}\n` +
          `🔢 کد: ${code}\n` +
          `✉️ پیام: ${s.text || "—"}\n` +
          `📡 فرستنده: ${s.sender || "?"}\n` +
          `🆔 سفارش: ${order.id} (${order.provider})`;
        await sock.sendMessage(order.chat, { text: txt }).catch(() => {});
      }
    } catch (e) {
      /* خطای موقتی — تلاش دوباره در سیکل بعد */
    }

    // تایم‌اوت ۱۰ دقیقه
    if (Date.now() - order.startedAt > 10 * 60 * 1000) {
      clearInterval(iv);
      order.timer = null;
      if (!order.done) {
        order.done = true;
        await sock
          .sendMessage(order.chat, {
            text:
              `⏳ ۱۰ دقیقه گذشت و کدی برای ${order.phone} نیامد.\n` +
              `کنسل و استرداد: !otp cancel ${order.id}\n` +
              `یا بررسی دستی: !otp check ${order.id}`,
          })
          .catch(() => {});
      }
    }
  }, 6000);
  order.timer = iv;
}

// ================= 5sim =================
async function s5Buy(product, country, operator) {
  const r = await fetchT(
    `https://5sim.net/v1/user/buy/activation/${country}/${operator}/${product}`,
    {
      headers: { Authorization: "Bearer " + KEYS["5sim"], Accept: "application/json" },
    }
  );
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.detail || "HTTP " + r.status);
  return j; // {id, phone, price, ...}
}

async function s5Check(id) {
  const r = await fetchT(`https://5sim.net/v1/user/check/${id}`, {
    headers: { Authorization: "Bearer " + KEYS["5sim"], Accept: "application/json" },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.detail || "HTTP " + r.status);
  return j; // {sms: [{text, code, sender, created_at}]}
}

async function s5Cancel(id) {
  const r = await fetchT(`https://5sim.net/v1/user/cancel/${id}`, {
    headers: { Authorization: "Bearer " + KEYS["5sim"], Accept: "application/json" },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.detail || "HTTP " + r.status);
  return j;
}

async function s5Finish(id) {
  const r = await fetchT(`https://5sim.net/v1/user/finish/${id}`, {
    headers: { Authorization: "Bearer " + KEYS["5sim"], Accept: "application/json" },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.detail || "HTTP " + r.status);
  return j;
}

// ================= sms-activate =================
const ACT_ERR = {
  BAD_KEY: "کلید API اشتباه است",
  NO_BALANCE: "موجودی کافی نیست",
  NO_NUMBERS: "شماره‌ای موجود نیست",
  WRONG_SERVICE: "سرویس اشتباه است",
  SERVICE_NOT_AVAILABLE: "سرویس در دسترس نیست",
  WRONG_ACTION: "اکشن اشتباه",
  WRONG_STATUS: "وضعیت اشتباه",
  NO_ACTIVATION: "سفارش فعالی نیست",
  ACCESS_ACTIVATION: "سفارش قبلاً فعال شده",
  ACCESS_CANCEL: "کنسل شد",
  ALREADY_FINISHED: "قبلاً تمام شده",
  NO_SMS: "پیامکی نرسیده",
};
function actErr(t) {
  const k = String(t).split(":")[0].trim();
  return ACT_ERR[k] || String(t).replace(/_/g, " ");
}

async function actNumber(service, country, operator) {
  const p = new URLSearchParams({
    api_key: KEYS["activate"],
    action: "getNumber",
    service: service || "ot",
    country: country || "0",
    operator: operator || "any",
  });
  const r = await fetchT("https://sms-activate.org/stubs/handler_api.php?" + p);
  const t = await r.text();
  if (t.startsWith("ACCESS_NUMBER")) {
    const [, id, phone] = t.split(":");
    return { id, phone };
  }
  throw new Error(t);
}

async function actStatus(id) {
  const p = new URLSearchParams({
    api_key: KEYS["activate"],
    action: "getStatus",
    id,
  });
  const r = await fetchT("https://sms-activate.org/stubs/handler_api.php?" + p);
  return await r.text();
}

async function actSetStatus(id, status) {
  const p = new URLSearchParams({
    api_key: KEYS["activate"],
    action: "setStatus",
    id,
    status,
  });
  const r = await fetchT("https://sms-activate.org/stubs/handler_api.php?" + p);
  return await r.text();
}

// ---------- لیست‌ها ----------
const COUNTRIES_5SIM = [
  "russia", "ukraine", "kazakhstan", "belarus", "china", "india",
  "indonesia", "philippines", "vietnam", "egypt", "brazil", "colombia",
  "turkey", "pakistan", "bangladesh", "nigeria", "morocco", "germany",
  "france", "united_kingdom",
];
const SERVICES_5SIM = [
  "any", "whatsapp", "telegram", "google", "instagram", "facebook",
  "tiktok", "vk", "yandex", "mail_ru", "discord", "twitter",
  "netflix", "amazon", "uber", "snapchat", "signal", "wechat",
];
const SERVICES_ACT = {
  ot: "سایر", wa: "واتساپ", tg: "تلگرام", go: "گوگل", ig: "اینستاگرام",
  fb: "فیسبوک", tk: "تیک‌تاک", tw: "توییتر", vk: "وی‌کی", ok: "اودنوکلاسنیکی", ub: "اوبر",
};

const ok = (sock, from, text) => sock.sendMessage(from, { text });
const err = (sock, from, text) => sock.sendMessage(from, { text });

// ---------- هندلر ----------
export default async function otp(sock, from, body, m, args) {
  const sub = (args[0] || "help").toLowerCase();
  try {
    switch (sub) {
      case "help": {
        await ok(
          sock,
          from,
          `📱 OTP VAULT — شماره مجازی

!otp rent <سرویس> [provider] [کشور] [اپراتور]
  مثال:
  !otp rent telegram
  !otp rent whatsapp activate
  !otp rent any 5sim indonesia any

!otp check [id]      ← بررسی پیامک‌ها
!otp cancel [id]     ← کنسل + استرداد
!otp finish [id]     ← اتمام سفارش
!otp stop [id]       ← توقف چک خودکار (بدون کنسل)
!otp list            ← سفارش‌های فعال
!otp countries       ← کشورهای 5sim
!otp services        ← سرویس‌ها

💳 کلید API را از 5sim.net یا sms-activate.org بخر (پولی).`
        );
        return;
      }

      case "rent": {
        const product = (args[1] || "any").toLowerCase();
        const provider = (args[2] || "5sim").toLowerCase();
        const country = (args[3] || (provider === "5sim" ? "russia" : "0")).toLowerCase();
        const operator = (args[4] || "any").toLowerCase();

        if (!["5sim", "activate"].includes(provider))
          return err(sock, from, "❌ provider باید 5sim یا activate باشد");
        if (!KEYS[provider])
          return err(
            sock,
            from,
            `❌ کلید API برای ${provider} تنظیم نشده.\nفایل otp-config.json بساز:\n{"5sim":"...", "activate":"..."}`
          );

        await ok(sock, from, `⏳ در حال اجاره شماره (${provider} / ${product})...`);

        let order;
        if (provider === "5sim") {
          const j = await s5Buy(product, country, operator);
          order = { provider, id: String(j.id), phone: j.phone, price: j.price, product };
        } else {
          const a = await actNumber(product, country, operator);
          order = { provider, id: String(a.id), phone: a.phone, product };
        }
        order.chat = from;
        order.startedAt = Date.now();
        order.sent = new Set();
        order.done = false;
        orders.set(order.id, order);

        await ok(
          sock,
          from,
          `✅ شماره اجاره شد!

📱 شماره: ${order.phone}
🆔 سفارش: ${order.id}
🏷 سرویس: ${product} (${provider})
${order.price != null ? `💵 قیمت: ${order.price}` : ""}

⏳ چک خودکار هر ۶ ثانیه (۱۰ دقیقه).
📩 کد به همین چت ارسال می‌شود.
کنسل: !otp cancel ${order.id}`
        );
        startPoll(sock, order);
        return;
      }

      case "check": {
        const id = args[1];
        if (!id) return err(sock, from, "❌ آیدی سفارش را بده: !otp check <id>");
        const order = orders.get(id);
        const provider = order?.provider || args[2] || "5sim";
        if (provider === "5sim") {
          const j = await s5Check(id);
          const sms = j.sms || [];
          if (!sms.length) return ok(sock, from, `📭 هنوز پیامکی نرسیده (سفارش ${id}).`);
          const lines = sms
            .map(
              (s) =>
                `🔢 کد: ${s.code || "?"}\n✉️ ${s.text || ""}\n📡 ${s.sender || "?"}\n🕒 ${s.created_at || ""}`
            )
            .join("\n\n");
          return ok(sock, from, `📩 پیامک‌های سفارش ${id}:\n\n${lines}`);
        }
        const st = await actStatus(id);
        if (st.startsWith("STATUS_OK")) return ok(sock, from, `✅ کد: ${st.split(":")[1]}`);
        if (st === "STATUS_WAIT_CODE") return ok(sock, from, "⏳ در انتظار کد...");
        return ok(sock, from, "📋 وضعیت: " + actErr(st));
      }

      case "cancel": {
        const id = args[1];
        if (!id) return err(sock, from, "❌ آیدی سفارش را بده: !otp cancel <id>");
        const order = orders.get(id);
        const provider = order?.provider || args[2] || "5sim";
        if (order) stopPoll(order);
        if (provider === "5sim") {
          await s5Cancel(id);
          return ok(sock, from, `✅ سفارش ${id} کنسل شد (استرداد در صورت امکان انجام شد).`);
        }
        const t = await actSetStatus(id, 8);
        return ok(sock, from, "📋 " + actErr(t));
      }

      case "finish": {
        const id = args[1];
        if (!id) return err(sock, from, "❌ آیدی سفارش را بده: !otp finish <id>");
        const order = orders.get(id);
        const provider = order?.provider || args[2] || "5sim";
        if (order) stopPoll(order);
        if (provider === "5sim") {
          await s5Finish(id);
          return ok(sock, from, `✅ سفارش ${id} تمام شد.`);
        }
        const t = await actSetStatus(id, 6);
        return ok(sock, from, "📋 " + actErr(t));
      }

      case "stop": {
        if (args[1]) {
          const order = orders.get(args[1]);
          if (!order) return err(sock, from, "❌ سفارشی با این آیدی پیدا نشد.");
          stopPoll(order);
          return ok(sock, from, `🛑 چک خودکار سفارش ${args[1]} متوقف شد (شماره کنسل نشد).`);
        }
        const last = [...orders.values()].filter((o) => !o.done).pop();
        if (!last) return err(sock, from, "❌ سفارش فعالی نیست.");
        stopPoll(last);
        return ok(sock, from, `🛑 چک خودکار سفارش ${last.id} متوقف شد.`);
      }

      case "list": {
        if (!orders.size) return ok(sock, from, "📭 سفارش فعالی نیست.");
        const lines = [...orders.values()]
          .map(
            (o) =>
              `${o.id} | ${o.phone} | ${o.product} (${o.provider}) | ${o.done ? "تمام" : "فعال"}`
          )
          .join("\n");
        return ok(sock, from, "📋 سفارش‌ها:\n" + lines);
      }

      case "countries":
        return ok(sock, from, "🌍 کشورهای 5sim:\n" + COUNTRIES_5SIM.join(", ") + "\n\nلیست کامل در پنل 5sim.");

      case "services":
        return ok(
          sock,
          from,
          "🏷 سرویس‌های 5sim:\n" +
            SERVICES_5SIM.join(", ") +
            "\n\n🏷 کدهای sms-activate:\n" +
            Object.entries(SERVICES_ACT)
              .map(([k, v]) => `${k} (${v})`)
              .join(", ")
        );

      default:
        return ok(sock, from, "❌ زیردستور ناشناخته. !otp help");
    }
  } catch (e) {
    console.log("OTP ERROR:", e);
    await err(sock, from, "❌ " + actErr(e.message));
  }
}
