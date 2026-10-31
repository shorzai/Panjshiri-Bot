export default async function whois(sock, from, body, m, args) {
  try {
    const number = args[0];

    if (!number) {
      return sock.sendMessage(from, {
        text: "📌 استفاده: !whois 9379xxxx"
      });
    }

    const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";

    // چک کردن وجود شماره
    const exists = await sock.onWhatsApp(jid);

    if (!exists || !exists[0]?.exists) {
      return sock.sendMessage(from, {
        text: "❌ این شماره در واتساپ وجود ندارد"
      });
    }

    let pp;
    try {
      pp = await sock.profilePictureUrl(jid, "image");
    } catch {
      pp = null;
    }

    const status = exists[0];

    let name = "نام موجود نیست";
    try {
      const contact = await sock.fetchStatus(jid);
      if (contact?.status) name = contact.status;
    } catch {}

    let msg = `
🕵️ WHOIS INFO

📱 شماره: ${jid}
📌 وجود در واتساپ: ✔️

👤 نام/Status:
${name}

📊 Raw Data:
${JSON.stringify(status, null, 2)}
`;

    if (pp) {
      await sock.sendMessage(from, {
        image: { url: pp },
        caption: msg
      });
    } else {
      await sock.sendMessage(from, {
        text: msg
      });
    }

  } catch (e) {
    console.log("WHOIS ERROR:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در گرفتن اطلاعات این شماره"
    });
  }
}