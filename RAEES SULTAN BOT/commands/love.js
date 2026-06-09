const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function love(sock, from, body, m, args) {
  try {
    // اسم دو طرف (اختیاری)
    const text = args.join(" ");

    const percent = Math.floor(Math.random() * 101);

    // پیام اول (افکت فکر کردن)
    await sock.sendMessage(from, {
      text: "💘 در حال محاسبه میزان عشق..."
    });

    await sleep(1500);

    // تحلیل نمایشی
    let status = "";
    let emoji = "";

    if (percent <= 30) {
      status = "💔 رابطه ضعیف است";
      emoji = "🥀";
    } else if (percent <= 60) {
      status = "💛 شاید امیدی باشد";
      emoji = "🌼";
    } else if (percent <= 80) {
      status = "💖 رابطه خوب است";
      emoji = "🌹";
    } else {
      status = "💞 عشق واقعی!";
      emoji = "💍🔥";
    }

    // خروجی نهایی
    const msg = `
❤️ LOVE CALCULATOR ❤️

${text ? `👫 ${text}\n` : ""}
📊 Percentage: ${percent}%

${emoji} ${status}
`;

    await sock.sendMessage(from, {
      text: msg
    });

  } catch (e) {
    console.log("Love Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در محاسبه عشق"
    });
  }
}