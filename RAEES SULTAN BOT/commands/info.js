export default async function info(sock, from, body, m) {
  try {
    const jid = m.key.remoteJid;

    const time = new Date();

    const date = time.toLocaleDateString();
    const hour = time.toLocaleTimeString();

    const user = m.key.participant || jid;

    const msg = `
📊 SYSTEM INFO

🆔 Chat ID:
${jid}

👤 User:
${user}

📅 Date:
${date}

⏰ Time:
${hour}

⚡ Status:
🟢 Active Session
`;

    await sock.sendPresenceUpdate("composing", from);

    await sock.sendMessage(from, {
      text: msg
    });

    await sock.sendPresenceUpdate("available", from);

  } catch (e) {
    console.log("Info Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در گرفتن اطلاعات"
    });
  }
}