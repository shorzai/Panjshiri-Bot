// =======================
// DOWNLOAD.JS v3 — TERMUX EDITION
// موتور: yt-dlp (بدون API key)
// فالبک: پلیر تیک‌تاک / ddinstagram / اندبد / پلاگین فیسبوک
// =======================

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const exec = promisify(execFile);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MAX_SIZE = 50 * 1024 * 1024; // سقف امن واتساپ روی موبایل

const extract = (text, re) => {
  const m = String(text).match(re);
  return m ? m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/") : null;
};

const detect = (url) => {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  return null;
};

// ---------- موتور yt-dlp ----------
async function dlp(url, { audio = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-"));
  const outBase = path.join(dir, "media");
  const args = [
    "--no-playlist", "--no-warnings", "--no-check-certificates",
    "-o", outBase + ".%(ext)s",
  ];

  const cookieFile = path.join(process.cwd(), "cookies.txt");
  if (fs.existsSync(cookieFile)) args.push("--cookies", cookieFile);

  if (audio) {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    // 480p برای ترمکس — سبک برای CPU موبایل
    args.push("-f", "bv*[height<=480]+ba/b[height<=480]", "--merge-output-format", "mp4");
  }
  args.push(url);

  await exec("yt-dlp", args, { timeout: 300000, maxBuffer: 20 * 1024 * 1024 });

  const files = fs.readdirSync(dir)
    .filter((f) => !f.endsWith(".part"))
    .map((f) => path.join(dir, f))
    .filter((f) => fs.statSync(f).isFile());
  if (!files.length) throw new Error("❌ هیچ فایلی دانلود نشد");
  return { files, dir };
}

// ---------- فشرده‌سازی با ffmpeg اگر > سقف ----------
async function compressVideo(file) {
  const size = fs.statSync(file).size;
  if (size <= MAX_SIZE) return file;
  const out = file + ".c.mp4";
  // فقط یک مرحله 360p — رم موبایل را نسوزان
  try {
    await exec(
      "ffmpeg",
      ["-y", "-i", file, "-vf", "scale=-2:360", "-crf", "30", "-preset", "veryfast",
       "-c:v", "libx264", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out],
      { timeout: 300000 }
    );
    if (fs.statSync(out).size <= MAX_SIZE) return out;
  } catch (_) {}
  return file;
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`دریافت فایل ناموفق بود (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_SIZE)
    throw new Error(`حجم فایل (${Math.round(buf.length / 1048576)}MB) از حد واتساپ بیشتر است`);
  return buf;
}

// ---------- تیک‌تاک (پلیر رسمی، بدون واترمارک) ----------
async function tiktok(url) {
  const id =
    extract(url, /\/video\/(\d+)/) ||
    extract(url, /\/photo\/(\d+)/) ||
    extract(url, /\/v\/(\d+)/);
  if (!id) throw new Error("❌ لینک تیک‌تاک معتبر نیست");

  const r1 = await fetch(`https://www.tiktok.com/player/v1/${id}?autoplay=0`, {
    headers: { "user-agent": UA },
  });
  if (r1.ok) {
    const j = await r1.json().catch(() => null);
    const u = j?.playAddr?.[0] || j?.playApi?.[0];
    if (u) return { url: u, title: j?.titleInfo?.title || "tiktok", isImage: false };
  }

  const r2 = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: { "user-agent": UA },
  });
  if (!r2.ok) throw new Error("❌ تیک‌تاک درخواست را محدود کرد");
  const o = await r2.json();
  if (o.thumbnail_url) return { url: o.thumbnail_url, title: o.title || "tiktok", isImage: true };
  throw new Error("❌ لینک ویدیو از تیک‌تاک دریافت نشد");
}

// ---------- فالبک اینستاگرام ۱: ddinstagram ----------
async function instaDD(code) {
  const r = await fetch(`https://www.ddinstagram.com/p/${code}/`, {
    headers: { "user-agent": UA, "accept-language": "en" },
  });
  const html = await r.text();
  const vid =
    extract(html, /<meta property="og:video" content="([^"]+)"/) ||
    extract(html, /"video_url":"([^"]+)"/);
  const img = extract(html, /<meta property="og:image" content="([^"]+)"/);
  if (vid) return { url: vid, isImage: false };
  if (img) return { url: img, isImage: true };
  return null;
}

// ---------- فالبک اینستاگرام ۲: اندبد ----------
async function instaEmbed(code) {
  const page = await fetch(`https://www.instagram.com/p/${code}/embed/captioned/`, {
    headers: { "user-agent": UA, "accept-language": "en" },
  });
  const html = await page.text();
  const video = extract(html, /"video_url":"(https:[^"]+)"/);
  const img = extract(html, /"display_url":"(https:[^"]+)"/);
  if (video) return { url: video, isImage: false };
  if (img) return { url: img, isImage: true };
  return null;
}

// ---------- فالبک فیسبوک: پلاگین ویدیو ----------
async function fbPlugin(url) {
  const page = await fetch(
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=640`,
    { headers: { "user-agent": UA, "accept-language": "en" } }
  );
  const html = await page.text();
  const hd = extract(html, /"hd_src":"(https:[^"]+)"/);
  const sd = extract(html, /"sd_src":"(https:[^"]+)"/);
  const src = hd || sd;
  if (src) return { url: src, isImage: false };
  return null;
}

async function sendFile(sock, from, file, caption) {
  const ext = path.extname(file).replace(".", "").toLowerCase();
  const buf = fs.readFileSync(file);
  if (ext === "mp3" || ext === "m4a" || ext === "opus" || ext === "wav") {
    await sock.sendMessage(from, { audio: buf, mimetype: "audio/mpeg", ptt: false, caption });
    return;
  }
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") {
    await sock.sendMessage(from, { image: buf, caption });
    return;
  }
  await sock.sendMessage(from, { video: buf, mimetype: "video/mp4", caption });
}

// ---------- هندلر ----------
export default async function download(sock, from, body, m, args) {
  try {
    const url = args.find((a) => /^https?:\/\//i.test(a));
    if (!url) {
      await sock.sendMessage(from, {
        text:
          "⬇️ دانلودر ترمکس (v3)\n\n" +
          "!dl <url>          → ویدیو/عکس/صوت\n" +
          "!dl <url> audio    → فقط MP3\n\n" +
          "پشتیبانی: یوتیوب | تیک‌تاک | اینستاگرام | فیس‌بوک",
      });
      return;
    }

    const wantAudio = args.includes("audio") || args.includes("mp3");
    const plat = detect(url);
    if (!plat) {
      await sock.sendMessage(from, { text: "❌ پلتفرم پشتیبانی‌شده نیست." });
      return;
    }

    await sock.sendMessage(from, { text: `⏳ در حال پردازش (${plat})...` });
    let done = false;

    if (plat === "youtube") {
      const r = await dlp(url, { audio: wantAudio });
      if (wantAudio) {
        await sock.sendMessage(from, {
          audio: fs.readFileSync(r.files[0]),
          mimetype: "audio/mpeg",
          caption: "🎵 یوتیوب",
        });
      } else {
        const file = await compressVideo(r.files[0]);
        await sendFile(sock, from, file, "🎬 یوتیوب");
      }
      fs.rmSync(r.dir, { recursive: true, force: true });
      done = true;
    }

    if (plat === "tiktok" && !done) {
      try {
        const t = await tiktok(url);
        const buf = await fetchBuffer(t.url);
        if (t.isImage) {
          await sock.sendMessage(from, { image: buf, caption: "📸 " + (t.title || "tiktok") });
        } else {
          await sock.sendMessage(from, { video: buf, mimetype: "video/mp4", caption: "🎬 " + (t.title || "tiktok") });
        }
      } catch (e1) {
        const r = await dlp(url);
        const file = await compressVideo(r.files[0]);
        await sendFile(sock, from, file, "🎬 تیک‌تاک");
        fs.rmSync(r.dir, { recursive: true, force: true });
      }
      done = true;
    }

    if (plat === "instagram" && !done) {
      try {
        const r = await dlp(url);
        const file = await compressVideo(r.files[0]);
        await sendFile(sock, from, file, "📸 اینستاگرام");
        fs.rmSync(r.dir, { recursive: true, force: true });
      } catch (e1) {
        console.log("IG dlp failed:", e1.message);
        const code = extract(url, /(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
        let t = code ? await instaDD(code) : null;
        if (!t && code) t = await instaEmbed(code);
        if (!t)
          throw new Error("❌ اینستاگرام محدود کرده — با روش کوکی دوباره تلاش کن (پایین را ببین).");
        const buf = await fetchBuffer(t.url);
        if (t.isImage) {
          await sock.sendMessage(from, { image: buf, caption: "📸 اینستاگرام" });
        } else {
          await sock.sendMessage(from, { video: buf, mimetype: "video/mp4", caption: "🎬 اینستاگرام" });
        }
      }
      done = true;
    }

    if (plat === "facebook" && !done) {
      try {
        const r = await dlp(url);
        const file = await compressVideo(r.files[0]);
        await sendFile(sock, from, file, "🎬 فیسبوک");
        fs.rmSync(r.dir, { recursive: true, force: true });
      } catch (e1) {
        console.log("FB dlp failed:", e1.message);
        const t = await fbPlugin(url);
        if (!t)
          throw new Error("❌ فیسبوک محدود کرده — با روش کوکی دوباره تلاش کن (پایین را ببین).");
        const buf = await fetchBuffer(t.url);
        await sock.sendMessage(from, { video: buf, mimetype: "video/mp4", caption: "🎬 فیسبوک" });
      }
      done = true;
    }
  } catch (e) {
    console.log("DOWNLOAD ERROR:", e.message);
    await sock.sendMessage(from, { text: `❌ ${e.message}` });
  }
}
