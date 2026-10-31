export default async function id(sock, from, body, m) {
  try {
    const jid = m.key.remoteJid;
    const user = m.key.participant || jid;

    const now = new Date();

    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    const msg = `
🆔 USER INFORMATION

📌 Chat ID:
${jid}

👤 User ID:
${user}

📅 Date:
${date}

⏰ Time:
${time}

🟢 Status:
ACTIVE SESSION
`;

    // typing effect (realistic feel)
    await sock.sendPresenceUpdate("composing", from);

    await sock.sendMessage(from, {
      text: msg
    });

    await sock.sendPresenceUpdate("available", from);

  } catch (e) {
    console.log("ID Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در گرفتن اطلاعات ID"
    });
  }
}