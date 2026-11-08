export default async function ssweb(sock, from, body, m, args) {
    try {
        let url = args[0];
        if (!url || !url.startsWith("http")) {
            return await sock.sendMessage(from, { text: "⚠️ لطفاً یک لینک معتبر بفرستید.\nمثال: !ssweb https://google.com" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "📸 در حال گرفتن اسکرین‌شات از سایت..." }, { quoted: m });

        // استفاده از سرویس رایگان و پایدار thum.io
        const screenshotUrl = `https://image.thum.io/get/width/1000/crop/800/${url}`;
        
        await sock.sendMessage(from, {
            image: { url: screenshotUrl },
            caption: `✅ اسکرین‌شات سایت: ${url}`
        }, { quoted: m });

    } catch (error) {
        console.log("SSWEB ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در گرفتن اسکرین‌شات." }, { quoted: m });
    }
}