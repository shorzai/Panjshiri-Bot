export default async function shorten(sock, from, body, m, args) {
    try {
        let url = args[0];
        if (!url || !url.startsWith("http")) {
            return await sock.sendMessage(from, { text: "⚠️ لطفاً یک لینک معتبر وارد کنید.\nمثال: !shorten https://google.com" }, { quoted: m });
        }

        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const shortUrl = await res.text();

        await sock.sendMessage(from, { text: `🔗 *لینک کوتاه شما:*\n\n${shortUrl}` }, { quoted: m });
    } catch (error) {
        await sock.sendMessage(from, { text: "❌ خطا در کوتاه کردن لینک." }, { quoted: m });
    }
}
