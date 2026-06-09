import fs from "fs";

const file = "./data/economy.json";

// ساخت دیتابیس
let db = {};

// لود کردن دیتا به شکل امن
if (fs.existsSync(file)) {
  try {
    db = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.log("⚠️ فایل خراب بود، دوباره ساخته شد");
    db = {};
  }
}

// ذخیره کردن دیتا
function save() {
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export default async function economy(sock, from, body, m, args) {
  const user = m.key.participant || from;

  // اگر کاربر وجود نداشت
  if (!db[user]) {
    db[user] = {
      money: 0,
      bank: 0,
    };
  }

  const cmd = body.split(" ")[0].toLowerCase();
  const amount = parseInt(args[0]);

  // 🪙 نمایش بالانس
  if (cmd === "balance" || cmd === "!balance") {
    return sock.sendMessage(from, {
      text: `💰 پول: ${db[user].money}\n🏦 بانک: ${db[user].bank}`,
    });
  }

  // 💵 گرفتن پول روزانه
  if (cmd === "daily" || cmd === "!daily") {
    db[user].money += 500;

    save();

    return sock.sendMessage(from, {
      text: "🎁 شما 500 سکه دریافت کردید!",
    });
  }

  // 💸 انتقال پول
  if (cmd === "pay" || cmd === "!pay") {
    if (!amount || amount <= 0) {
      return sock.sendMessage(from, {
        text: "❌ مثال: !pay 100",
      });
    }

    if (db[user].money < amount) {
      return sock.sendMessage(from, {
        text: "❌ پول کافی نداری!",
      });
    }

    db[user].money -= amount;

    save();

    return sock.sendMessage(from, {
      text: `✅ ${amount} سکه پرداخت شد`,
    });
  }

  // 🏦 ذخیره در بانک
  if (cmd === "deposit" || cmd === "!deposit") {
    if (!amount || amount <= 0) {
      return sock.sendMessage(from, {
        text: "❌ مثال: !deposit 100",
      });
    }

    if (db[user].money < amount) {
      return sock.sendMessage(from, {
        text: "❌ پول کافی نداری!",
      });
    }

    db[user].money -= amount;
    db[user].bank += amount;

    save();

    return sock.sendMessage(from, {
      text: `🏦 ${amount} سکه داخل بانک ذخیره شد`,
    });
  }

  // 💳 برداشت از بانک
  if (cmd === "withdraw" || cmd === "!withdraw") {
    if (!amount || amount <= 0) {
      return sock.sendMessage(from, {
        text: "❌ مثال: !withdraw 100",
      });
    }

    if (db[user].bank < amount) {
      return sock.sendMessage(from, {
        text: "❌ موجودی بانک کافی نیست!",
      });
    }

    db[user].bank -= amount;
    db[user].money += amount;

    save();

    return sock.sendMessage(from, {
      text: `💳 ${amount} سکه برداشت شد`,
    });
  }

  // اگر دستور نشناخته شد
  return sock.sendMessage(from, {
    text:
      "📌 دستورات:\n" +
      "!balance\n!daily\n!pay <amount>\n!deposit <amount>\n!withdraw <amount>",
  });
}