import { resolve } from '@totallynotdavid/downloader';

export default async function instagram(sock, from, body, m, args) {
  if (!args[0]) {
    return sock.sendMessage(from, { text: "📌 لینک اینستاگرام رو بفرست:\n.ig https://www.instagram.com/reel/xxxx" }, { quoted: m });
  }

  const url = args[0];
  if (!url.includes("instagram.com")) {
    return sock.sendMessage(from, { text: "❌ لینک اینستاگرام نامعتبر است." }, { quoted: m });
  }

  const loading = await sock.sendMessage(from, { text: "⏳ در حال دانلود..." }, { quoted: m });

  try {
    const result = await resolve(url);
    const media = result.urls?.[0];
    if (!media?.url) throw new Error("مدیا پیدا نشد");

    if (media.type === "video") {
      await sock.sendMessage(from, {
        video: { url: media.url },
        caption: `📸 ${result.meta?.author || 'Instagram'}\n📝 ${result.meta?.title || ''}\n\n📥 SULTAN BOT`
      }, { quoted: m });
    } else {
      await sock.sendMessage(from, {
        image: { url: media.url },
        caption: `📸 ${result.meta?.author || 'Instagram'}\n\n📥 SULTAN BOT`
      }, { quoted: m });
    }

    await sock.sendMessage(from, { delete: loading.key });
  } catch (e) {
    console.log("INSTAGRAM ERROR:", e);
    await sock.sendMessage(from, { text: "❌ خطا: " + e.message, edit: loading.key });
  }
}