import crypto from "crypto";

export default async function hash(sock, from, body, m, args) {
    const text = args.join(" ");
    if (!text) {
        return await sock.sendMessage(from, { text: "⚠️ متنی که می‌خواهید هش شود را وارد کنید.\nمثال: !hash سلام" }, { quoted: m });
    }

    // تولید هش‌های مختلف
    const md5 = crypto.createHash('md5').update(text).digest('hex');
    const sha1 = crypto.createHash('sha1').update(text).digest('hex');
    const sha256 = crypto.createHash('sha256').update(text).digest('hex');

    const result = `
╭━━━〔 🔐 Hash Generator 〕━━━╮
┃
┃ 📝 *متن اصلی:* ${text}
┃
┃ 🛡️ *MD5:*
┃ \`${md5}\`
┃
┃ 🛡️ *SHA-1:*
┃ \`${sha1}\`
┃
┃ 🛡️ *SHA-256:*
┃ \`${sha256}\`
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
    await sock.sendMessage(from, { text: result }, { quoted: m });
}