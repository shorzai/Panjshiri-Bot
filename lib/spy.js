import { getDB } from "./db.js";

async function sendToOwners(sock, text) {
  const db = getDB();
  const owners = db.users || [];
  for (const owner of owners) {
    const jid = owner.includes("@") ? owner : owner + "@s.whatsapp.net";
    try {
      await sock.sendMessage(jid, { text });
    } catch (e) {
      console.log("SPY SEND ERROR:", e.message);
    }
  }
}

export default function spy(sock) {

  // 👤 ورود / خروج / ارتقا / عزل
  sock.ev.on("group-participants.update", async (update) => {
    try {
      const { id, participants, action, author } = update;

      let groupName = id;
      try {
        const meta = await sock.groupMetadata(id);
        groupName = meta.subject || id;
      } catch {}

      const authorNum = author ? author.split("@")[0] : "نامعلوم";

      for (const p of participants) {
        const num = p.split("@")[0];
        let text = "";

        if (action === "add") {
          text = `👤➕ *عضو جدید*\n\n👥 گروه: ${groupName}\n📞 شماره: ${num}\n👑 توسط: ${authorNum}`;
        } else if (action === "remove") {
          text = `👤➖ *خروج/حذف عضو*\n\n👥 گروه: ${groupName}\n📞 شماره: ${num}\n👑 توسط: ${authorNum}`;
        } else if (action === "promote") {
          text = `👑⬆️ *ارتقا به ادمین*\n\n👥 گروه: ${groupName}\n📞 شماره: ${num}\n👑 توسط: ${authorNum}`;
        } else if (action === "demote") {
          text = `👑⬇️ *حذف از ادمینی*\n\n👥 گروه: ${groupName}\n📞 شماره: ${num}\n👑 توسط: ${authorNum}`;
        }

        if (text) await sendToOwners(sock, text);
      }
    } catch (e) {
      console.log("SPY PARTICIPANT ERROR:", e.message);
    }
  });

  // 📝 تغییر نام / توضیحات گروه
  sock.ev.on("groups.update", async (updates) => {
    try {
      for (const u of updates) {
        const { id, subject, desc } = u;
        if (!id) continue;

        let text = "";
        if (subject) {
          text = `📝 *تغییر نام گروه*\n\n👥 نام جدید: ${subject}\n🆔 ${id.split("@")[0]}`;
        } else if (desc !== undefined) {
          text = `📄 *تغییر توضیحات گروه*\n\n🆔 ${id.split("@")[0]}\n📝 ${desc || "(خالی)"}`;
        }

        if (text) await sendToOwners(sock, text);
      }
    } catch (e) {
      console.log("SPY GROUP ERROR:", e.message);
    }
  });

  console.log("✅ SPY SYSTEM STARTED");
}