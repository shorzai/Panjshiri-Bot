import { readData } from "./reader.js";

export default async function pv(sock, m, from, body, isGroup) {
  if (isGroup) return;

  const react = async (emoji) => {
    await sock.sendMessage(from, { react: { text: emoji, key: m.key } });
  };

  const sendGift = async (jid, type, title, emoji) => {
    const files = ["1", "2"];

    for (let i = 0; i < 4; i++) {
      const file = files[i % 2];
      const msg = readData(type, file);

      await sock.sendMessage(jid, {
        text: `
╭━━━〔 🎁 ${emoji} ${title} 〕━━━⬣
┃
${msg}
┃
┃ 👑 RAEES BOT SYSTEM
╰━━━━━━━━━━━━━━⬣
        `.trim()
      });

      await new Promise(r => setTimeout(r, 700));
    }
  };

  if (body.startsWith("war ")) {
    let num = body.split(" ")[1];
    let jid = num.replace(/\D/g, "") + "@s.whatsapp.net";

    await sendGift(jid, "war", "WAR SYSTEM", "⚔️");
    return react("⚔️");
  }

  if (body.startsWith("powerpgr ")) {
    let num = body.split(" ")[1];
    let jid = num.replace(/\D/g, "") + "@s.whatsapp.net";

    await sendGift(jid, "power", "POWER SYSTEM", "⚡");
    return react("⚡");
  }
}