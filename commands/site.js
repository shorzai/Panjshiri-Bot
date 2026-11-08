export default async function site(sock, from, body, m) {
    const text = `
╭━━━〔 🌐 وب‌اپلیکیشن رسمی 〕━━━╮
┃
┃ شما می‌توانید از طریق لینک زیر،
┃ ربات را روی گوشی خود نصب کنید
┃ و از تمام امکانات استفاده کنید!
┃
┃ 🔗 *لینک ورود به سایت:*
┃ https://raees-sultan-bot.onrender.com
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
    await sock.sendMessage(from, { text }, { quoted: m });
}