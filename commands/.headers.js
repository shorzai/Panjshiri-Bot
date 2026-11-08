export default async function headers(sock, from, body, m, args) {
    try {
        let url = args[0];
        if (!url || !url.startsWith("http")) {
            return await sock.sendMessage(from, { text: "⚠️ لطفاً لینک معتبر وارد کنید.\nمثال: !headers https://google.com" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🕵️‍♂️ در حال استخراج هدرهای سرور..." }, { quoted: m });

        const res = await fetch(url, { method: 'HEAD' });
        
        const server = res.headers.get('server') || 'نامشخص';
        const poweredBy = res.headers.get('x-powered-by') || 'نامشخص';
        const cfRay = res.headers.get('cf-ray') ? 'بله (Cloudflare)' : 'خیر';
        const contentType = res.headers.get('content-type') || 'نامشخص';

        const text = `
╭━━━〔 🌐 HTTP Headers 〕━━━╮
┃
┃ 🔗 *سایت:* ${url}
┃
┃ 🖥️ *سرور (Server):* ${server}
┃ ⚙️ *پلتفرم (Powered-By):* ${poweredBy}
┃ 🛡️ *Cloudflare:* ${cfRay}
┃ 📄 *نوع محتوا:* ${contentType.split(';')[0]}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.log("HEADERS ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در استخراج اطلاعات. احتمالاً سایت دسترسی را بسته است." }, { quoted: m });
    }
}