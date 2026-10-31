https://social-download-all-in-one.p.rapidapi.com/v1/social/autolinkimport fetch from "node-fetch";
import { fileTypeFromBuffer } from "file-type";

export default async function aio(sock, from, body, m, args) {
  try {
    const url = args.join(" ").trim();
    if (!url) return sock.sendMessage(from, { text: "📌 مثال:\n!aio لینک" });

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // ---------- 1) صدا زدن API ----------
    const res = await fetch(
      "https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json; charset=utf-8",
          "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com",
          "x-rapidapi-key": "57862c7befmsh6c4cd6f9df3427bp1f1bdajsna23f013a136f"
        },
        body: JSON.stringify({ url })
      }
    );

    const raw = await res.text(); // اول متن خام را بگیر تا خطای API قابل خواندن باشد
    if (!res.ok) {
      console.error("API ERROR BODY:", raw);
      throw new Error(`API خطا داد (کد ${res.status}): ${raw.slice(0, 200)}`);
    }

    const json = JSON.parse(raw);
    console.log("AIO RESPONSE:", JSON.stringify(json, null, 2));

    if (!json.medias?.length) {
      throw new Error("رسانه‌ای از این لینک توسط API یافت نشد.");
    }

    // ---------- 2) پیدا کردن ویدیو / صدا ----------
    const video = json.medias.find(v =>
      (v.type === "video" || JSON.stringify(v).toLowerCase().includes("video"))
    );

    if (!video) throw new Error("هیچ ویدیویی در پاسخ API پیدا نشد.");

    console.log("دانلود از:", video.url);

    // ---------- 3) دانلود فایل با هدر مناسب ----------
    const r = await fetch(video.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.instagram.com/"
      }
    });

    if (!r.ok) {
      throw new Error(`دانلود فایل ناموفق بود (کد ${r.status})`);
    }

    const buffer = Buffer.from(await r.arrayBuffer());
    console.log("حجم فایل:", (buffer.length / 1024 / 1024).toFixed(2), "مگابایت");

    if (buffer.length < 1000) {
      throw new Error("فایل دریافتی خالی یا خراب است.");
    }

    const type = await fileTypeFromBuffer(buffer);
    console.log("نوع فایل:", type?.mime || "نامشخص");

    // ---------- 4) ارسال به واتساپ ----------
    await sock.sendMessage(from, {
      video: buffer,
      mimetype: type?.mime || "video/mp4",
      caption: "🎯 ALL IN ONE DOWNLOADER\n\n🤖 SULTAN BUG BOT"
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("AIO ERROR:", e);
    await sock.sendMessage(from, {
      text: `❌ خطا:\n📌 ${e.message || e}`
    });
  }
}