export default async function getpp(sock, from, body, m, args) {
  try {
    const number = args[0];

    // check input
    if (!number) {
      return sock.sendMessage(from, {
        text: "📌 Usage: !getpp 9379xxxx"
      });
    }

    // sanitize number
    const clean = number.replace(/\D/g, "");

    if (!clean) {
      return sock.sendMessage(from, {
        text: "⚠️ شماره نامعتبر است"
      });
    }

    const jid = clean + "@s.whatsapp.net";

    let pp;

    try {
      pp = await sock.profilePictureUrl(jid, "image");
    } catch {
      pp = null;
    }

    // typing effect
    await sock.sendPresenceUpdate("composing", from);

    if (!pp) {
      return sock.sendMessage(from, {
        text: "❌ این کاربر پروفایل ندارد یا قابل دریافت نیست"
      });
    }

    await sock.sendMessage(from, {
      image: { url: pp },
      caption: `
📸 PROFILE FETCHED

📱 Number: +${clean}
🆔 JID: ${jid}

⚡ Status: Success
`
    });

    await sock.sendPresenceUpdate("available", from);

  } catch (e) {
    console.log("GetPP Error:", e);

    await sock.sendMessage(from, {
      text: "❌ خطا در دریافت پروفایل"
    });
  }
}