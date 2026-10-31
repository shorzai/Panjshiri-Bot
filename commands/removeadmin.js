// =======================
// REMOVEADMIN.JS — حذف ادمین‌های گروه
//
// دستورات:
//   !rmadmin                → حذف همهٔ ادمین‌ها (به‌جز خود بات و شما)
//   !rmadmin @موردی        → حذف ادمین خاص
//   !rmadmin all            → حذف همه (شامل ادمین‌های دیگر، به‌جز بات)
//   !rmadmin list           → لیست ادمین‌های فعلی
//   !rmadmin me             → حذف ادمین از خودت (اگر ادمین هستی)
//
// نکته: فقط ادمین گروه می‌تواند اجرا کند (یا مالک بات)
// =======================

// بررسی اینکه یک شرکت‌کننده ادمین است
const isAdmin = (p) => (p.admin === "admin" || p.admin === "superadmin");

// بررسی اینکه فرستنده ادمین گروه است یا مالک بات
async function checkAuth(sock, from, m) {
  const meta = await sock.groupMetadata(from);
  const senderId = m.key.participant || m.key.remoteJid;

  const sender = meta.participants.find(
    (p) => p.id === senderId || p.id.split("@")[0] === senderId.split("@")[0]
  );

  if (!sender) return false;

  // ادمین بودن در گروه
  if (isAdmin(sender)) return true;

  // مالک بات (شماره‌ای که بات با آن ساخته شده)
  // اگر بات به‌عنوان مالک شماره‌ات را بشناسد، اینجا چک می‌شود
  return false;
}

export default async function rmadmin(sock, from, body, m, args) {
  try {
    // =======================
    // فقط در گروه کار می‌کند
    // =======================
    if (!from.includes("@g.us")) {
      await sock.sendMessage(from, { text: "❌ این دستور فقط در گروه کار می‌کند." });
      return;
    }

    const arg = (args[0] || "").toLowerCase();

    // =======================
    // لیست ادمین‌ها
    // =======================
    if (arg === "list") {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(isAdmin);
      if (admins.length === 0) {
        await sock.sendMessage(from, { text: "📋 هیچ ادمینی در گروه نیست." });
        return;
      }
      const lines = admins.map((p, i) =>
        `${i + 1}. ${p.id.split("@")[0]}${p.admin === "superadmin" ? " 👑" : ""}`
      );
      await sock.sendMessage(from, {
        text: `📋 ادمین‌های گروه (${admins.length}):\n\n${lines.join("\n")}`,
      });
      return;
    }

    // =======================
    // چک دسترسی
    // =======================
    const meta = await sock.groupMetadata(from);
    const senderId = m.key.participant || m.key.remoteJid;
    const sender = meta.participants.find(
      (p) => p.id.split("@")[0] === senderId.split("@")[0]
    );

    const botId = sock.user?.id?.split(":")[0] || "";
    const isBotAdmin = meta.participants.some(
      (p) => p.id.split("@")[0] === botId && isAdmin(p)
    );

    if (!sender || !isAdmin(sender)) {
      await sock.sendMessage(from, { text: "⛔ فقط ادمین گروه می‌تواند این کار را کند." });
      return;
    }

    if (!isBotAdmin) {
      await sock.sendMessage(from, { text: "🤖 بات باید ادمین گروه باشد تا بتواند حذف ادمین کند." });
      return;
    }

    // =======================
    // تعیین ادمین‌های هدف
    // =======================
    let targets = [];

    if (arg === "all") {
      // همهٔ ادمین‌ها به‌جز بات
      targets = meta.participants.filter((p) => isAdmin(p) && p.id.split("@")[0] !== botId);
    } else if (arg === "me") {
      targets = meta.participants.filter((p) => isAdmin(p) && p.id.split("@")[0] === senderId.split("@")[0]);
    } else if (arg === "") {
      // پیش‌فرض: همه به‌جز بات و خود فرستنده
      targets = meta.participants.filter(
        (p) => isAdmin(p) &&
              p.id.split("@")[0] !== botId &&
              p.id.split("@")[0] !== senderId.split("@")[0]
      );
    } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      // منشن‌شده‌ها
      const mentioned = m.message.extendedTextMessage.contextInfo.mentionedJid;
      targets = meta.participants.filter(
        (p) => mentioned.includes(p.id) && isAdmin(p)
      );
    } else {
      // جستجوی مستقیم شماره در آرگومان‌ها
      const nums = args.filter((a) => /^\d+$/.test(a));
      targets = meta.participants.filter(
        (p) => nums.includes(p.id.split("@")[0]) && isAdmin(p)
      );
      if (targets.length === 0) {
        await sock.sendMessage(from, {
          text: "❌ کاربر مشخص‌شده یا ادمین نیست یا در گروه حضور ندارد.\n" +
                "استفاده: !rmadmin | !rmadmin @user | !rmadmin all | !rmadmin list | !rmadmin me",
        });
        return;
      }
    }

    if (targets.length === 0) {
      await sock.sendMessage(from, { text: "✅ هیچ ادمینی برای حذف پیدا نشد." });
      return;
    }

    // =======================
    // اجرای حذف ادمین
    // =======================
    const ids = targets.map((p) => p.id);
    await sock.groupParticipantsUpdate(from, ids, "demote");

    await sock.sendMessage(from, {
      text: `🗡 ${ids.length} ادمین حذف شد:\n\n` +
            ids.map((id) => `• ${id.split("@")[0]}`).join("\n") +
            `\n\n✅ انجام شد.`,
    });
  } catch (e) {
    console.log("RMADMIN ERROR:", e.message);
    await sock.sendMessage(from, { text: `❌ خطا: ${e.message}` });
  }
}
