import SpottyDL from 'spottydl';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function spotify(sock, from, body, m, args) {
  if (!args[0]) {
    return sock.sendMessage(from, { text: "📌 لینک اسپاتیفای رو بفرست:\n.spotify https://open.spotify.com/track/xxxx" }, { quoted: m });
  }

  const url = args[0];
  if (!url.includes("spotify.com")) {
    return sock.sendMessage(from, { text: "❌ لینک اسپاتیفای نامعتبر است." }, { quoted: m });
  }

  const loading = await sock.sendMessage(from, { text: "⏳ در حال دانلود..." }, { quoted: m });

  try {
    const track = await SpottyDL.getTrack(url);
    if (!track) throw new Error("آهنگ پیدا نشد");

    const tmpDir = os.tmpdir();
    const result = await SpottyDL.downloadTrack(track, tmpDir);

    if (result?.[0]?.status === "Success") {
      const filePath = result[0].filename;
      const buffer = fs.readFileSync(filePath);

      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: "audio/mpeg",
        fileName: path.basename(filePath),
        ptt: false
      }, { quoted: m });

      fs.unlinkSync(filePath);
    } else {
      throw new Error("دانلود ناموفق بود");
    }

    await sock.sendMessage(from, { delete: loading.key });
  } catch (e) {
    console.log("SPOTIFY ERROR:", e);
    await sock.sendMessage(from, { text: "❌ خطا: " + e.message, edit: loading.key });
  }
}