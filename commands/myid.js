export default async function myid(sock, from, body, m, args) {
  const sender = m.key.participant || from;
  const senderNum = sender.split("@")[0];

  await sock.sendMessage(from, {
    text: `🆔 *اطلاعات شما در واتساپ*\n\n📞 شماره/آیدی فرستنده: *${senderNum}*\n📋 آیدی کامل: ${sender}\n\n💡 اگر شماره بالا با شماره‌ای که توی دیتابیس گذاشتی (93794384087) فرق داره، یعنی شماره اشتباه ثبت شده.`
  }, { quoted: m });
}