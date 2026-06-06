export async function sendBox(sock, jid, text, title, emoji, m){

  await sock.sendMessage(jid, {
    text: text,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363000000000000@newsletter",
        newsletterName: title,
        serverMessageId: Date.now()
      }
    }
  });

  if(m){
    await sock.sendMessage(jid, {
      react: { text: emoji, key: m.key }
    });
  }
}