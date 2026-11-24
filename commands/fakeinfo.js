import axios from "axios";

export default async function fakeinfo(sock, from, body, m) {
    try {
        await sock.sendMessage(from, { text: "🕵️‍♂️ در حال ساخت هویت فیک..." }, { quoted: m });

        const res = await axios.get("https://randomuser.me/api/");
        const user = res.data.results[0];

        const name = `${user.name.first} ${user.name.last}`;
        const email = user.email;
        const location = `${user.location.city}, ${user.location.country}`;
        const phone = user.phone;
        const age = user.dob.age;
        const picture = user.picture.large;

        const text = `🕵️‍♂️ *هویت فیک تولید شد!*\n\n` +
                     `👤 *نام:* ${name}\n` +
                     `📅 *سن:* ${age}\n` +
                     `📧 *ایمیل:* ${email}\n` +
                     `📞 *تلفن:* ${phone}\n` +
                     `📍 *آدرس:* ${location}\n\n` +
                     `⚠️ *این اطلاعات کاملاً فیک و برای سرگرمی است.*`;

        await sock.sendMessage(from, { 
            image: { url: picture }, 
            caption: text 
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در ساخت هویت. دوباره تلاش کنید." }, { quoted: m });
    }
}
