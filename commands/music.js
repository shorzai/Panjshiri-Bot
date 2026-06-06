import axios from "axios";
import ytSearch from "yt-search";
import { sendBox } from "./box.js";

// =======================
// 🎵 MUSIC FINDER
// =======================
export default async function music(sock, from, body, m) {

  // =======================
  // !find SONG NAME
  // =======================
  if (body.startsWith("!find ")) {

    let q = body.replace("!find ", "").trim();

    if (!q) {
      return sendBox(sock, from, "📌 مثال: !find alan walker faded", "MUSIC", "🎵", m);
    }

    try {

      // 🔍 search youtube
      let search = await ytSearch(q);

      let video = search.videos?.[0];

      if (!video) {
        return sendBox(sock, from, "❌ چیزی پیدا نشد", "MUSIC", "⚠️", m);
      }

      let text =
`🎵 TITLE: ${video.title}
👤 CHANNEL: ${video.author?.name || "Unknown"}
⏱️ TIME: ${video.timestamp || "Unknown"}
🔗 LINK: ${video.url}`;

      // 📦 send info
      await sendBox(sock, from, text, "MUSIC FOUND", "🎧", m);

      // 🔗 send link separately
      await sock.sendMessage(from, {
        text: video.url
      });

    } catch (e) {
      console.log("Music error:", e);
      return sendBox(sock, from, "❌ خطا در جستجو", "MUSIC", "⚠️", m);
    }
  }
}