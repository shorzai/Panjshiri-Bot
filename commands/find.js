import { getDB } from "../lib/db.js";

export default async function find(sock, from, body, m, args) {
  try {
    // ============================
    // چک مالک ربات
    // ============================
    const db = getDB();
    const owners = db.users || [];
    const sender = m.key.participant || from;
    const senderNum = sender.split("@")[0];

    if (!owners.includes(sender) && !owners.includes(senderNum)) {
      return sock.sendMessage(from, {
        text: "⛔ این دستور فقط برای مالک ربات است."
      }, { quoted: m });
    }

    // ============================
    // پارس شماره
    // ============================
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: `📌 استفاده:\n.find 989123456789\n\nیا:\n.find +989123456789\n\nمی‌تونی @user هم منشن کنی:\n.find @user`
      }, { quoted: m });
    }

    let targetNum = "";

    // اگه منشن بود
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned.length > 0) {
      targetNum = mentioned[0].split("@")[0];
    } else {
      // از آرگومان بگیر
      targetNum = args[0].replace(/[^0-9]/g, "");
    }

    if (targetNum.length < 8) {
      return sock.sendMessage(from, {
        text: "❌ شماره معتبر نیست."
      }, { quoted: m });
    }

    const targetJid = targetNum + "@s.whatsapp.net";

    // ============================
    // پیام لودینگ
    // ============================
    const loadingMsg = await sock.sendMessage(from, {
      text: `🔍 در حال جستجوی شماره *${targetNum}* در گروه‌ها...\n\n⏳ لطفاً صبر کن...`
    }, { quoted: m });

    // ============================
    // گرفتن همه گروه‌ها
    // ============================
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups);

    if (!groupList || groupList.length === 0) {
      return sock.sendMessage(from, {
        text: "❌ ربات توی هیچ گروهی نیست.",
        edit: loadingMsg.key
      });
    }

    // ============================
    // جستجو
    // ============================
    const foundIn = [];
    const adminIn = [];

    for (const group of groupList) {
      const participants = group.participants || [];
      const found = participants.find(
        p => p.id === targetJid || p.id.split("@")[0] === targetNum
      );

      if (found) {
        foundIn.push({
          id: group.id,
          subject: group.subject || "بدون نام",
          isAdmin: !!found.admin
        });

        if (found.admin) {
          adminIn.push(group.subject);
        }
      }
    }

    // ============================
    // نتیجه
    // ============================
    if (foundIn.length === 0) {
      return sock.sendMessage(from, {
        text: `❌ شماره *${targetNum}* توی هیچ گروهی که ربات عضوشه پیدا نشد.\n\n📊 تعداد گروه‌های چک‌شده: ${groupList.length}`,
        edit: loadingMsg.key
      });
    }

    let resultText = `✅ *نتیجه جستجو*\n\n`;
    resultText += `📞 شماره: ${targetNum}\n`;
    resultText += `👥 در ${foundIn.length} گروه پیدا شد\n`;
    if (adminIn.length > 0) {
      resultText += `👑 ادمین در ${adminIn.length} گروه\n`;
    }
    resultText += `\n━━━━━━━━━━━━━━\n\n`;

    foundIn.forEach((g, i) => {
      resultText += `${i + 1}. ${g.isAdmin ? "👑" : "👤"} ${g.subject}\n`;
    });

    resultText += `\n━━━━━━━━━━━━━━`;
    resultText += `\n📊 از ${groupList.length} گروه چک شد`;

    return sock.sendMessage(from, {
      text: resultText,
      edit: loadingMsg.key
    });

  } catch (e) {
    console.log("FIND ERROR:", e);
    return sock.sendMessage(from, {
      text: "❌ خطا در جستجو: " + e.message
    }, { quoted: m });
  }
}