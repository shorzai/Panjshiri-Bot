import dns from "dns/promises";

export default async function dnsLookup(sock, from, body, m, args) {
    try {
        const domain = args[0];
        if (!domain) {
            return await sock.sendMessage(from, { text: "⚠️ لطفاً یک دامنه وارد کنید.\nمثال: !dns google.com" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `🕵️‍♂️ در حال استخراج رکوردهای DNS برای: ${domain}...` }, { quoted: m });

        let ip = "نامشخص", mx = "نامشخص", txt = "نامشخص";

        try { const ipRes = await dns.resolve4(domain); ip = ipRes.join(", "); } catch (e) {}
        try { const mxRes = await dns.resolveMx(domain); mx = mxRes.map(r => r.exchange).join(", "); } catch (e) {}
        try { const txtRes = await dns.resolveTxt(domain); txt = txtRes.map(r => r.join("")).join(" | ").substring(0, 100) + "..."; } catch (e) {}

        const text = `
╭━━━〔 🌐 DNS Lookup 〕━━━╮
┃
┃ 🔗 *دامنه:* ${domain}
┃
┃ 📍 *آی‌پی (A Record):*
┃ ${ip}
┃
┃ 📧 *سرور ایمیل (MX):*
┃ ${mx}
┃
┃ 📝 *رکورد متنی (TXT):*
┃ ${txt}
┃
╰━━━━━━━━━━━━━━━━━━━━━╯
`;
        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.log("DNS ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در دریافت اطلاعات DNS." }, { quoted: m });
    }
}