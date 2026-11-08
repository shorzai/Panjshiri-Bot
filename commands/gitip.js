import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

export default async function gitip(sock, from, body, m, args) {
    try {
        const input = args[0];
        if (!input) {
            return await sock.sendMessage(from, { 
                text: "⚠️ *لطفاً یک دامنه یا شماره وارد کنید.*\n\nمثال:\n!gitip google.com\n!gitip 93794384087" 
            }, { quoted: m });
        }

        // اگر ورودی فقط شامل اعداد بود، یعنی شماره تلفن است
        if (/^\d+$/.test(input)) {
            await sock.sendMessage(from, { text: "🔍 در حال بررسی شماره در واتساپ..." }, { quoted: m });
            
            // چک کردن اینکه شماره در واتساپ هست یا نه
            const [result] = await sock.onWhatsApp(input);
            
            if (!result || !result.exists) {
                return await sock.sendMessage(from, { text: "❌ این شماره در واتساپ ثبت نشده است." }, { quoted: m });
            }

            let ppUrl = null;
            try {
                // گرفتن عکس پروفایل شماره
                ppUrl = await sock.profilePictureUrl(result.jid, 'image');
            } catch (e) {}

            const text = `
╭━━━〔 📱 مشخصات شماره واتساپ 〕━━━╮
┃
┃ 📞 *شماره:* ${result.jid.split('@')[0]}
┃ ✅ *وضعیت:* فعال در واتساپ
┃ 🆔 *آیدی (JID):* ${result.jid}
┃ 🖼️ *عکس پروفایل:* ${ppUrl ? "دارد" : "ندارد"}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
            if (ppUrl) {
                await sock.sendMessage(from, { image: { url: ppUrl }, caption: text }, { quoted: m });
            } else {
                await sock.sendMessage(from, { text }, { quoted: m });
            }
        } else {
            // اگر حروف داشت، یعنی دامنه سایت است (Get IP)
            await sock.sendMessage(from, { text: `🔍 در حال دریافت آی‌پی برای: ${input}...` }, { quoted: m });
            
            const { address, family } = await lookup(input);
            
            const text = `
╭━━━〔 🌐 IP Resolver (Get IP) 〕━━━╮
┃
┃ 🔗 *دامنه:* ${input}
┃ 📍 *آی‌پی (IP):* ${address}
┃ 🔢 *نسخه:* IPv${family}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
            await sock.sendMessage(from, { text }, { quoted: m });
        }
    } catch (error) {
        console.log("GITIP ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در پردازش درخواست. مطمئن شوید ورودی صحیح است (مثلاً دامنه بدون http)." }, { quoted: m });
    }
}