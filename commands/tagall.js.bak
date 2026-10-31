export async function tagall(sock, from, m) {
  try {
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants;

    let text = "📢 TAG ALL MEMBERS\n\n";
    let mentions = [];

    for (let p of participants) {
      const jid = p.id;
      mentions.push(jid);
      text += `👤 @${jid.split("@")[0]}\n`;
    }

    await sock.sendMessage(from, {
      text,
      mentions
    });

  } catch (e) {
    console.log("TagAll Error:", e);
  }
}