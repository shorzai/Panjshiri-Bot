// commands/ipinfo.js

export default async function ipinfo(sock, from, body, m, args) {
    try {
        const ip = args[0];
        if (!ip) {
            return await sock.sendMessage(from, { 
                text: "⚠️ *لطفاً یک آدرس IP وارد کنید.*\n\nمثال:\n!ipinfo 8.8.8.8" 
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `🔍 در حال دریافت اطلاعات برای IP: ${ip}...` }, { quoted: m });

        // استفاده از API رایگان ipwho.is (بدون نیاز به کلید)
        const response = await fetch(`https://ipwho.is/${ip}`);
        const data = await response.json();

        if (!data.success) {
            return await sock.sendMessage(from, { 
                text: `❌ اطلاعاتی برای IP مورد نظر یافت نشد.\nدلیل: ${data.message || 'نامعتبر'}` 
            }, { quoted: m });
        }

        const text = `
╭━━━〔 🌐 IP Info Lookup 〕━━━╮
┃
┃ 📍 *IP:* ${data.ip}
┃ 🏳️ *کشور:* ${data.country} (${data.country_code})
┃ 🏙️ *شهر:* ${data.city}
┃ 🗺️ *منطقه:* ${data.region}
┃ 📮 *کد پستی:* ${data.postal}
┃
┃ 📡 *ISP / شرکت:* ${data.connection?.isp || 'نامشخص'}
┃ 🕒 *منطقه زمانی:* ${data.timezone?.id || 'نامشخص'}
┃ 🧭 *مختصات:* ${data.latitude}, ${data.longitude}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.log("IPINFO CMD ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در دریافت اطلاعات IP. لطفاً بعداً تلاش کنید." }, { quoted: m });
    }
}