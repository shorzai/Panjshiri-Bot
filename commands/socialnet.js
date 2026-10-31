import { getDB, saveDB } from "../lib/db.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";

export default async function socialnet(sock, from, body, m, args) {
  const db = getDB();
  db.feed ??= {};
  db.feed[from] ??= [];

  const cmd = args[0]?.toLowerCase();
  const text = args.slice(1).join(" ");
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  // ─── ثبت پست جدید (متن یا عکس) ───
  if (cmd === "post") {
    const isImage = !!m.message?.imageMessage;
    if (!text && !isImage) return sock.sendMessage(from, { text: "📌 متن رو بنویس یا عکس با کپشن !post بفرست." }, { quoted: m });

    const postId = Date.now().toString().slice(-4);
    let mediaPath = null;

    if (isImage) {
      try {
        const buffer = await downloadMediaMessage(m, "buffer", {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage });
        mediaPath = `./database/feed_${postId}.jpg`;
        fs.writeFileSync(mediaPath, buffer);
      } catch (e) { console.log("POST IMG ERROR:", e.message); }
    }

    db.feed[from].unshift({
      id: postId, author: sender, text: text, mediaPath: mediaPath,
      likes: [], comments: [], time: Date.now()
    });
    if (db.feed[from].length > 30) db.feed[from].pop();
    saveDB(db);

    return sock.sendMessage(from, { text: `✅ پست *#${postId}* ثبت شد.\n❤️ لایک: !like ${postId}\n💬 کامنت: !comment ${postId} متن` }, { quoted: m });
  }

  // ─── مشاهده فید ───
  if (cmd === "feed") {
    const posts = db.feed[from];
    if (!posts.length) return sock.sendMessage(from, { text: "📭 فید خالیه." }, { quoted: m });

    let result = `📱 *فید گروه* (آخرین پست‌ها)\n\n`;
    posts.slice(0, 3).forEach(p => {
      result += `🔹 *#${p.id}* | @${p.author.split("@")[0]}\n`;
      result += `📝 ${p.text || "(بدون متن)"}\n`;
      result += `❤️ ${p.likes.length} لایک | 💬 ${p.comments.length} کامنت\n`;
      result += `➖➖➖➖➖➖➖➖\n`;
    });
    
    // ارسال اولین پست همراه با عکس (اگر عکس داشت)
    const firstPost = posts[0];
    if (firstPost.mediaPath && fs.existsSync(firstPost.mediaPath)) {
      return sock.sendMessage(from, { image: fs.readFileSync(firstPost.mediaPath), caption: result, mentions: posts.map(p=>p.author) }, { quoted: m });
    }
    return sock.sendMessage(from, { text: result, mentions: posts.map(p=>p.author) }, { quoted: m });
  }

  // ─── لایک ───
  if (cmd === "like") {
    const post = db.feed[from].find(p => p.id === args[1]);
    if (!post) return sock.sendMessage(from, { text: "❌ پست پیدا نشد." }, { quoted: m });
    if (post.likes.includes(sender)) return sock.sendMessage(from, { text: "⚠️ قبلاً لایک کردی!" }, { quoted: m });
    
    post.likes.push(sender); saveDB(db);
    return sock.sendMessage(from, { text: `❤️ لایک شد! مجموع: ${post.likes.length}` }, { quoted: m });
  }

  // ─── کامنت ───
  if (cmd === "comment") {
    const post = db.feed[from].find(p => p.id === args[1]);
    const commentText = args.slice(2).join(" ");
    if (!post || !commentText) return sock.sendMessage(from, { text: "❌ پست یا متن کامنت پیدا نشد." }, { quoted: m });

    post.comments.push({ author: sender, text: commentText });
    saveDB(db);
    return sock.sendMessage(from, { text: `💬 کامنت شما روی پست *#${post.id}* ثبت شد.` }, { quoted: m });
  }

  return sock.sendMessage(from, { text: "📌 دستورات:\n!post | !feed | !like [id] | !comment [id] [متن]" }, { quoted: m });
}