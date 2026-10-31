import { getDB, saveDB } from "./db.js";

// ==========================================
// ⚡ 1. توابع کمکی (Helper Functions)
// ==========================================

// رفع باگ واتساپ (تبدیل آبجکت LID به متن)
function extractJid(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return item.id || item.jid || item.phoneNumber || item.lid || null;
  }
  return null;
}

// تاریخ شمسی (با قابلیت تبدیل تایم‌استمپ)
function getPersianDate(timestamp = null) {
  try {
    const date = timestamp ? new Date(timestamp * 1000) : new Date();
    return date.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "نامشخص";
  }
}

// انتخاب تصادفی
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// تشخیص زمان روز
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { emoji: "🌅", text: "صبح بخیر" };
  if (hour >= 12 && hour < 17) return { emoji: "☀️", text: "ظهر بخیر" };
  if (hour >= 17 && hour < 21) return { emoji: "🌆", text: "عصر بخیر" };
  return { emoji: "🌙", text: "شب بخیر" };
}

// گرفتن عکس پروفایل کاربر یا گروه
async function getProfilePic(sock, jid) {
  try {
    return await sock.profilePictureUrl(jid, "image");
  } catch {
    return null;
  }
}

// گرفتن لینک دعوت گروه (اگر ربات ادمین باشد)
async function getGroupLink(sock, id) {
  try {
    const code = await sock.groupInviteCode(id);
    return `https://chat.whatsapp.com/${code}`;
  } catch {
    return null;
  }
}

// ==========================================
// 🎭 2. پیام‌های تصادفی
// ==========================================
const welcomeMessages = [
  "🎉 به جمع ما خوش اومدی، امیدواریم لحظات خوبی داشته باشی!",
  "✨ خوش آمدی رفیق! جای خالیت اینجا خیلی خالی بود.",
  "🌟 یه ستاره جدید به گروه ما اضافه شد!",
  "🔥 یه عضو خفن جدید داریم! خوش اومدی.",
  "🚀 به سفینه ما خوش اومدی، مقصد: تفریح و دوستی!",
  "👋 سلام! خوش اومدی به خانواده جدیدت.",
  "💎 یه الماس جدید به گنجینه‌مون اضافه شد!",
  "🎊 گروه با اومدنت رنگ و بوی تازه‌ای گرفت."
];

const goodbyeMessages = [
  "👋 خداحافظ! امیدواریم هر جا هستی موفق باشی.",
  "💔 رفتنت برامون سخته، ولی موفق باشی!",
  "🌟 خداحافظ رفیق! در پناه خدا.",
  "🕊️ خداحافظ! امیدواریم دوباره ببینیمت.",
  "🚪 رفتنت یه جای گروه رو خالی کرد...",
  "🥀 امیدواریم روزهای خوبی رو کنار ما سپری کرده باشی."
];

// ==========================================
// 🤖 3. تابع اصلی (Main System)
// ==========================================
export default function welcome(sock) {

  sock.ev.on("group-participants.update", async (data) => {
    try {
      const { id, participants, action, author } = data;

      // دیتابیس
      const db = getDB();
      db.welcome ??= {};
      db.welcome[id] ??= { on: true };
      db.goodbye ??= {};
      db.goodbye[id] ??= { on: true };

      // اطلاعات گروه
      let group;
      try {
        group = await sock.groupMetadata(id);
      } catch (e) {
        console.log("WELCOME META ERROR:", e.message);
        return;
      }

      const totalMembers = group.participants.length;
      const totalAdmins = group.participants.filter(p => p.admin).length;
      const groupCreation = getPersianDate(group.creation);
      const groupLink = await getGroupLink(sock, id);
      const groupIcon = await getProfilePic(sock, id);

      // آیدی‌ها
      const authorJid = extractJid(author);
      const authorNum = authorJid ? authorJid.split("@")[0] : "نامعلوم";
      const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      // ==========================================
      // ➕ 3.1. عضو جدید (ADD)
      // ==========================================
      if (action === "add") {
        if (!db.welcome[id].on) return;

        for (const rawUser of participants) {
          const user = extractJid(rawUser); 
          if (!user || typeof user !== 'string') continue;

          const num = user.split("@")[0];
          const time = getTimeGreeting();
          
          // 🤖 سناریو 1: اگر خود ربات را به گروه اضافه کرده باشند
          if (user === botJid) {
            await sock.sendMessage(id, {
              text: `╔══════════════════════════════╗\n   🤖 *S Y S T E M   O N L I N E*   \n╚══════════════════════════════╝\n\nسلام ادمین @${authorNum} عزیز! 👋\nممنون که منو به گروه دعوت کردی.\n\nمن یک ربات فوق پیشرفته و هوشمند هستم. برای اینکه بتونم گروه رو مدیریت کنم، لطفاً منو *ادمین* کنید.\n\n⚡ *دستورات مهم:*\n🔹 منو: *.menu*\n🔹 ضد لینک: *.antilink on*\n🔹 ضد کلمات: *.badword add*\n\nمن آماده‌ی محافظت و سرگرم کردن گروه شما هستم! 🚀`,
              mentions: [user, authorJid].filter(Boolean)
            });
            continue;
          }

          // 👤 سناریو 2: کاربر عادی اضافه شده
          const pp = await getProfilePic(sock, user);
          const photoToUse = pp || groupIcon; // اگر کاربر عکس نداشت، عکس گروه را بفرست
          const randomMsg = pickRandom(welcomeMessages);

          // 🎨 قالب لوکس خوش‌آمدگویی
          const text =
`╔══════════════════════════════╗
║      ✦ *W E L C O M E* ✦      ║
╚══════════════════════════════╝

${time.emoji} ${time.text} *@${num}* عزیز
${randomMsg}

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🏛️ *مشخصات گروه*
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🏷️ نام: ${group.subject}
┃ 👥 اعضا: ${totalMembers} نفر
┃ 👑 ادمین‌ها: ${totalAdmins} نفر
┃ 📅 تاسیس: ${groupCreation}
┃ 📜 بیو: ${group.desc ? group.desc.slice(0, 30) + "..." : "ندارد"}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🛡️ *وضعیت امنیتی*
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🤖 ربات: 🟢 آنلاین و آماده
┃ 🔗 ضد لینک: ${db.groups?.[id]?.antilink ? "🟢 فعال" : "🔴 غیرفعال"}
┃ 🚫 ضد کلمات: ${db.badwords?.[id]?.length > 0 ? "🟢 فعال" : "🔴 غیرفعال"}
┃ 🔐 لینک گروه: ${groupLink ? "در دسترس" : "مخفی"}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ *قوانین طلایی گروه:*
┏ ➤ اسپم و تبلیغات ممنوع
┣ ➤ ارسال لینک بدون اجازه ممنوع
┣ ➤ رعایت احترام برای همه الزامیست
┗ ➤ توهین و تمسخر = اخراج

💎 امیدواریم لحظات فوق‌العاده‌ای کنار ما داشته باشی.

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🤖 *POWERED BY SULTAN BOT*
👑 *CREATOR: SULTAN SHIRZAI*
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`.trim();

          try {
            if (photoToUse) {
              await sock.sendMessage(id, { image: { url: photoToUse }, caption: text, mentions: [user] });
            } else {
              await sock.sendMessage(id, { text, mentions: [user] });
            }
          } catch (e) {
            console.log("WELCOME SEND ERROR:", e.message);
          }
        }
      }

      // ==========================================
      // ➖ 3.2. خروج / حذف (REMOVE)
      // ==========================================
      if (action === "remove") {
        if (!db.goodbye[id].on) return;

        for (const rawUser of participants) {
          const user = extractJid(rawUser);
          if (!user || typeof user !== 'string') continue;

          if (user === botJid) continue; // اگه خود ربات حذف شد، پیام نده

          const num = user.split("@")[0];
          const randomMsg = pickRandom(goodbyeMessages);
          
          // تشخیص اخراج یا خروج شخصی
          let kicker = "🚪 خودش گروه را ترک کرد";
          if (authorJid && authorJid !== user) {
            kicker = `🥾 اخراج شده توسط @${authorNum}`;
          }

          // 🎨 قالب لوکس خداحافظی
          const text =
`╔══════════════════════════════╗
║      💔 *G O O D B Y E* 💔      ║
╚══════════════════════════════╝

@${num} از گروه خارج شد.

💬 *${randomMsg}*

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📌 *گزارش خروج*
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🏷️ گروه: ${group.subject}
┃ 👥 باقی‌مانده: ${totalMembers} نفر
┃ 🚪 نوع خروج: ${kicker}
┃ 📅 تاریخ: ${getPersianDate()}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

💔 هر جا هستی موفق و پیروز باشی.
امیدواریم دوباره ببینیمت...

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🤖 *SULTAN BOT SYSTEM*
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`.trim();

          const mentions = [user];
          if (authorJid && authorJid !== user) mentions.push(authorJid);

          try {
            await sock.sendMessage(id, { text, mentions });
          } catch (e) {
            console.log("GOODBYE SEND ERROR:", e.message);
          }
        }
      }

      // ==========================================
      // 👑 3.3. ارتقا و عزل (PROMOTE / DEMOTE)
      // ==========================================
      if (action === "promote" || action === "demote") {
        for (const rawUser of participants) {
          const user = extractJid(rawUser);
          if (!user || typeof user !== 'string') continue;

          const num = user.split("@")[0];
          const isPromote = action === "promote";

          const text = isPromote
            ? `╭━━〔 👑 *PROMOTED* 👑 〕━━╮\n\n@${num} به مقام ادمینی ارتقا یافت.\n👑 توسط: @${authorNum}\n\n🎉 تبریک! حالا می‌تونی گروه رو مدیریت کنی.\n\n╰━━〔 ⚡ SULTAN BOT 〕━━╯`
            : `╭━━〔 ⚠️ *DEMOTED* ⚠️ 〕━━╮\n\n@${num} از مقام ادمینی برکنار شد.\n👑 توسط: @${authorNum}\n\n🥀 امیدواریم دوباره شانس خودت رو امتحان کنی!\n\n╰━━〔 ⚡ SULTAN BOT 〕━━╯`;

          const mentions = [user];
          if (authorJid && authorJid !== user) mentions.push(authorJid);

          try {
            await sock.sendMessage(id, { text, mentions });
          } catch (e) {
            console.log("PROMOTE/DEMOTE ERROR:", e.message);
          }
        }
      }

    } catch (e) {
      console.log("WELCOME SYSTEM FATAL ERROR:", e.message);
    }
  });

  console.log("✅ Legendary Welcome System V3 Started Successfully");
}