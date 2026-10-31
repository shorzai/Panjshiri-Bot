import { getDB, saveDB } from "./db.js";
import axios from "axios";

export async function handleRPGInput(sock, from, body, m) {
  try {
    const sender = m.key.participant || from;
    const db = getDB();
    
    // چک میکنه که آیا این کاربر اصلاً بازی فعالی داره یا نه
    const game = db.rpg?.[from]?.[sender];
    if (!game) return false; // بازی نداره، برو دستورات عادی رو اجرا کن

    // چک میکنه که آیا ورودی یکی از گزینه‌هاست یا نه
    const choice = body.trim();
    if (!["1", "2", "3", "۱", "۲", "۳"].includes(choice)) return false;

    // تبدیل اعداد فارسی به انگلیسی
    const numChoice = choice.replace("۱", "1").replace("۲", "2").replace("۳", "3");

    const loading = await sock.sendMessage(from, { text: "🎲 در حال پیشروی در داستان..." }, { quoted: m });

    // گرفتن ۲ مرحله آخر تاریخچه برای اینکه AI یادش نره کجا بودیم
    const historyContext = game.history.slice(-2).join("\n---\n");

    const prompt = `You are a Text RPG Dungeon Master.
Previous context:
${historyContext}

The player chose option ${numChoice}.
Continue the story based on their choice. They might get hurt or find an item.
Respond EXACTLY in this format:
📖 [Next story scene]
❤️ HP: [New HP out of 100]
1️⃣ [Choice 1]
2️⃣ [Choice 2]
3️⃣ [Choice 3]

Rules: If they make a very bad choice, reduce HP by 20-40. If they do good, maybe give an item. If HP reaches 0, write GAME OVER in the story. Keep it short (under 100 words).`;

    const res = await axios.get(`https://api.siputzx.my.id/api/ai/gemini?text=${encodeURIComponent(prompt)}`, { timeout: 20000 });
    const aiText = res.data?.data?.answer || res.data?.result;

    if (!aiText) throw new Error("خطا در ارتباط با هوش مصنوعی");

    // آپدیت کردن دیتابیس
    game.history.push(`انتخاب کاربر: ${numChoice}`);
    game.history.push(aiText);
    if (game.history.length > 10) game.history.shift(); // جلوگیری از پر شدن حافظه
    game.step++;

    // آپدیت کردن HP از روی متن تولید شده توسط AI
    const hpMatch = aiText.match(/❤️ HP: (\d+)/);
    if (hpMatch) {
      game.hp = parseInt(hpMatch[1]);
    }

    // اگه HP صفر شد، بازی تمومه
    if (game.hp <= 0 || aiText.includes("GAME OVER")) {
      await sock.sendMessage(from, { 
        text: `${aiText}\n\n☠️ *بازی شما به پایان رسید!* برای شروع دوباره بنویسید .rpg`, 
        edit: loading.key 
      });
      delete db.rpg[from][sender];
    } else {
      await sock.sendMessage(from, { text: aiText, edit: loading.key });
    }

    saveDB(db);
    return true; // یعنی ورودی رو خوردیم و نباید بره سراغ دستورات دیگه

  } catch (e) {
    console.log("RPG ENGINE ERROR:", e);
    return false;
  }
}