export default async function online(sock, from) {
  try {
    // وضعیت آنلاین
    await sock.sendPresenceUpdate("available", from);

    // گرفتن زمان سرور
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();

    // اطلاعات بات
    const botName = sock.user?.name || "BOT";

    const text = `
🟢 BOT STATUS ONLINE

🤖 Name: ${botName}
⏰ Time: ${time}
📅 Date: ${date}

⚡ Status: Active & Running
`;

    await sock.sendMessage(from, {
      text
    });

  } catch (e) {
    console.log("Online Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در نمایش وضعیت ربات"
    });
  }
}