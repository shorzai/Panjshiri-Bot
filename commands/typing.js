const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function typing(sock, from, options = {}) {
  try {
    const {
      min = 2000,
      max = 7000,
      typingTime = null,
      read = true
    } = options;

    // زمان تصادفی یا دستی
    const time =
      typingTime ||
      Math.floor(Math.random() * (max - min + 1)) + min;

    // (اختیاری) دیده شدن پیام
    if (read) {
      await sock.readMessages([from]);
    }

    // شروع تایپ
    await sock.sendPresenceUpdate("composing", from);

    // مکث واقعی
    await sleep(time);

    // توقف تایپ
    await sock.sendPresenceUpdate("paused", from);

    // بعد از کمی تاخیر آنلاین شدن
    await sleep(500);

    await sock.sendPresenceUpdate("available", from);

  } catch (e) {
    console.log("Typing Error:", e);
  }
}