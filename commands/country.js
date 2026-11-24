import axios from "axios";

export default async function country(sock, from, body, m, args) {
    try {
        const countryName = args.join(" ").trim();
        if (!countryName) {
            return await sock.sendMessage(from, { text: "🌍 *Country Info*\n\nمثال:\n!country Afghanistan\n!country Iran" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `🔎 در حال دریافت اطلاعات ${countryName}...` }, { quoted: m });

        const res = await axios.get(`https://restcountries.com/v3.1/name/${countryName}?fullText=true`);
        const data = res.data[0];

        if (!data) throw new Error("Not found");

        const capital = data.capital ? data.capital[0] : "نامشخص";
        const currency = data.currencies ? Object.values(data.currencies)[0].name : "نامشخص";
        const pop = data.population.toLocaleString();
        const region = data.region;

        const caption = `🌍 *${data.name.common}* ${data.flag}\n\n` +
                        `🏙️ پایتخت: ${capital}\n` +
                        `👥 جمعیت: ${pop}\n` +
                        `🗺️ منطقه: ${region}\n` +
                        `💰 واحد پول: ${currency}\n\n` +
                        `👑 RAEES SULTAN BOT`;

        await sock.sendMessage(from, { 
            image: { url: data.flags.png }, 
            caption 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ کشوری با این نام پیدا نشد." }, { quoted: m });
    }
}
