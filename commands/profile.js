export default async function profile(sock, from, body, m) {
  try {
    let jid = from;

    // اگر در گروه بود، پروفایل گروه را بگیرد
    const isGroup = from.endsWith("@g.us");

    let pp;
    try {
      pp = await sock.profilePictureUrl(jid, "image");
    } catch {
      pp = null;
    }

    let caption = "";

    if (isGroup) {
      caption = "📸 GROUP PROFILE";
    } else {
      caption = "📸 USER PROFILE";
    }

    // اگر عکس بود بفرست
    if (pp) {
      await sock.sendMessage(from, {
        image: { url: pp },
        caption
      });
    } else {
      // اگر عکس نبود
      await sock.sendMessage(from, {
        text: `${caption}\n\n❌ هیچ عکس پروفایل پیدا نشد`
      });
    }

  } catch (e) {
    console.log("Profile Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در گرفتن پروفایل"
    });
  }
}