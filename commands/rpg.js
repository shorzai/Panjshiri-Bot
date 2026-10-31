import { getDB, saveDB } from "../lib/db.js";
import axios from "axios";

export default async function rpg(sock, from, body, m, args) {
  const sender = m.key.participant || from;
  const db = getDB();
  db.rpg ??= {};
  db.rpg[from] ??= {};

  const cmd = args[0]?.toLowerCase();

  // پایان دادن به بازی
  if (cmd === "end") {
    if (!db.rpg[from][sender]) {
      return sock.sendMessage(from, { text: "⚠️ شما بازی فعالی ندارید." }, { quoted: m });
    }
    delete db.rpg[from][sender];
    saveDB(db);
    return sock.sendMessage(from, { text: "🛑 بازی شما به پایان رسید." }, { quoted: m });
  }

  // دیدن وضعیت
  if (cmd === "status") {
    const game = db.rpg[from][sender];
    if (!game) return sock.sendMessage(from, { text: "⚠️ شما بازی فعالی ندارید. برای شروع بنویسید .rpg" }, { quoted: m });
    
    return sock.sendMessage(from, { 
      text: `📊 *وضعیت شما*\n\n❤️ سلامتی: ${game.hp}/100\n🎒 آیتم‌ها: ${game.items.length ? game.items.join(", ") : "خالی"}\n\nبرای ادامه بازی، عدد گزینه مورد نظر را بزنید (1، 2 یا 3).` 
    }, { quoted: m });
  }

  // شروع بازی جدید
  if (db.rpg[from][sender]) {
    return sock.sendMessage(from, { text: "⚠️ شما یک بازی فعال دارید! برای ادامه گزینه‌ها (1، 2 یا 3) را بزنید.\nبرای شروع مجدد اول .rpg end را بزنید." }, { quoted: m });
  }

  const loading = await sock.sendMessage(from, { text: "🎲 در حال ساخت دنیای جدید توسط هوش مصنوعی..." }, { quoted: m });

  try {
    // پرامپت سیستم برای هوش مصنوعی (دستور میده چطور داستان رو بسازه)
    const systemPrompt = `You are a professional text RPG Dungeon Master. The player just started. 
Create a thrilling, short fantasy opening scene in Persian. 
You MUST reply EXACTLY in this format without any extra text:
📖 [Short story scene]
❤️ HP: 100
1️⃣ [Choice 1]
2️⃣ [Choice 2]
3️⃣ [Choice 3]

Rules:
- Keep it under 100 words.
- Make the choices dangerous or mysterious.
- Always include the HP format (if HP changes, show it).`;

    const res = await axios.get(`https://api.siputzx.my.id/api/ai/gemini?text=${encodeURIComponent(systemPrompt)}`, { timeout: 20000 });
    const aiText = res.data?.data?.answer || res.data?.result;
    
    if (!aiText) throw new Error("پاسخی دریافت نشد");

    // ذخیره بازی در دیتابیس
    db.rpg[from][sender] = {
      hp: 100,
      items: [],
      history: [aiText],
      step: 1
    };
    saveDB(db);

    await sock.sendMessage(from, { text: aiText, edit: loading.key });

  } catch (e) {
    console.log("RPG START ERROR:", e);
    await sock.sendMessage(from, { text: "❌ خطا در ساخت داستان. لطفاً دوباره تلاش کنید.", edit: loading.key });
  }
}