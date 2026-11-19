import Tiktok from 'tiktok-video-scraper';

export default async function tiktok(sock, from, body, m, args) {
  if (!args[0]) {
    return sock.sendMessage(from, { text: "📌 لینک تیک‌تاک رو بفرست:\n.tiktok https://vm.tiktok.com/xxxx" }, { quoted: m });
  }

  const url = args[0];
  if (!url.includes("tiktok.com")) {
    return sock.sendMessage(from, { text: "❌ لینک تیک‌تاک نامعتبر است." }, { quoted: m });
  }

  const loading = await sock.sendMessage(from, { text: "⏳ در حال دانلود..." }, { quoted: m });

  try {
    const result = await Tiktok(url, { parse: true });
    const media = result.media?.[0];
    if (!media?.url) throw new Error("ویدیو پیدا نشد");

    await sock.sendMessage(from, {
      video: { url: media.url },
      caption: `🎵 ${result.username || 'TikTok'}\n📝 ${media.caption || ''}\n\n📥 بدون واترمارک | SULTAN BOT`
    }, { quoted: m });

    await sock.sendMessage(from, { delete: loading.key });
  } catch (e) {
    console.log("TIKTOK ERROR:", e);
    await sock.sendMessage(from, { text: "❌ خطا: " + e.message, edit: loading.key });
  }
}