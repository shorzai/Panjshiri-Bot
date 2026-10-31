const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function ghosttag(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];

    const users = participants.map(v => v.id);

    if (!users.length) {
      return sock.sendMessage(from, {
        text: "⚠️ هیچ عضوی در گروه پیدا نشد"
      });
    }

    // مرحله 1: آماده‌سازی
    await sock.sendPresenceUpdate("composing", from);
    await sleep(800);

    await sock.sendMessage(from, {
      text: "👻 Initializing Ghost Mode..."
    });

    // مرحله 2: مکث تصادفی برای طبیعی بودن
    await sleep(Math.floor(Math.random() * 1500) + 1000);

    // مرحله 3: فعال‌سازی
    await sock.sendMessage(from, {
      text: "☠️ Ghost Tag Activated"
    });

    await sock.sendPresenceUpdate("composing", from);
    await sleep(1200);

    // مرحله 4: ارسال تگ واقعی
    await sock.sendMessage(from, {
      text: "👻",
      mentions: users
    });

    // مرحله 5: پایان
    await sock.sendPresenceUpdate("available", from);

  } catch (e) {
    console.log("GhostTag GOD Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ Ghost Mode failed"
    });
  }
}