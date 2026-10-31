import yts from "yt-search";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";

// 📌 تنظیمات ربات (اینجا رو می‌تونی تغییر بدی)
const BOT_NAME = "SULTAN BOT V1";
const CREATOR = "SULTAN SHIRZAI";

export default async function play(sock, from, body, m, args) {
  if (!args.length) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 🎵 MUSIC DOWNLOADER 〕━━━╮\n\n📌 *استفاده:*\n.play اسم آهنگ\n.play https://youtu.be/xxxx\n\n🤖 ${BOT_NAME}\n👑 ${CREATOR}\n╰━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: m });
  }

  const query = args.join(" ");
  let loading = await sock.sendMessage(from, { text: "🔍 *در حال جستجو در یوتیوب...*" }, { quoted: m });

  try {
    let videoUrl = "";
    let videoTitle = "";
    let videoChannel = "";
    let videoDuration = "";
    let thumbnail = "";

    // ۱. جستجو یا بررسی لینک
    if (query.startsWith("http://") || query.startsWith("https://")) {
      videoUrl = query;
      const info = await ytdl.getInfo(videoUrl);
      videoTitle = info.videoDetails.title;
      videoChannel = info.videoDetails.author.name;
      thumbnail = info.videoDetails.thumbnails.pop().url;
      
      const seconds = parseInt(info.videoDetails.lengthSeconds);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      videoDuration = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      const search = await yts(query);
      if (!search.videos.length) throw new Error("آهنگی با این نام پیدا نشد.");
      
      const video = search.videos[0];
      videoUrl = video.url;
      videoTitle = video.title;
      videoChannel = video.author.name;
      videoDuration = video.timestamp;
      thumbnail = video.thumbnail;
    }

    // ۲. قالب خفن اطلاعات آهنگ (مثل عکس)
    const metadataText = `
╭────────〔 🎵 SONG DOWNLOADER 〕────────╮
│ 🎶 *Title*: ${videoTitle}
│ 📺 *Channel*: ${videoChannel}
│ ⏱️ *Duration*: ${videoDuration}
│ ⚡ *Quality*: 128kbps MP3
│ ⌛ *Status*: Downloading Audio...
├──────────────────────────┤
│ 🤖 *Bot*: ${BOT_NAME}
│ 👑 *Creator*: ${CREATOR}
╰────────〔 ⚡ SYSTEM 〕────────╯
`.trim();

    // آپدیت پیام لودینگ با اطلاعات آهنگ
    await sock.sendMessage(from, { 
        text: metadataText, 
        edit: loading.key 
    });

    // ۳. دانلود فایل صوتی
    const stream = ytdl(videoUrl, { 
        filter: "audioonly", 
        quality: "highestaudio",
        highWaterMark: 1 << 25 // جلوگیری از خطای محدودیت حافظه
    });
    
    const tempPath = path.join(process.cwd(), `audio_${Date.now()}.mp3`);
    const writeStream = fs.createWriteStream(tempPath);
    
    stream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      stream.on("error", reject);
    });

    const audioBuffer = fs.readFileSync(tempPath);

    // ۴. ارسال آهنگ نهایی به همراه کپشن
    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: "audio/mp4",
      fileName: `${videoTitle}.mp3`,
      ptt: false 
    }, { quoted: m });

    // ۵. تمیزکاری (پاک کردن فایل موقت و پیام لودینگ)
    fs.unlinkSync(tempPath);
    await sock.sendMessage(from, { delete: loading.key });

  } catch (e) {
    console.error("PLAY ERROR:", e);
    await sock.sendMessage(from, { 
        text: `❌ *خطا در دانلود!*\n\nدلیل: ${e.message}\n\n🤖 ${BOT_NAME}`, 
        edit: loading.key 
    });
  }
}