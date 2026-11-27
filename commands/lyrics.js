import axios from "axios";

export default async function lyrics(sock, from, body, m, args) {
    try {
        const query = args.join(" ").trim();
        if (!query) {
            return await sock.sendMessage(from, { text: "🎵 *Lyrics Search*\n\nUsage:\n!lyrics Shape of You\n!lyrics pasoori" }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🎵 Searching for lyrics..." }, { quoted: m });

        // Using a very stable free lyrics API
        const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`, { timeout: 15000 });
        const data = res.data;

        if (!data || !data.lyrics) throw new Error("Not found");

        const text = `🎵 *${data.title}*\n👤 *Artist:* ${data.artist}\n\n📝 *Lyrics:*\n\n${data.lyrics.substring(0, 3000)}...`;

        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ Lyrics not found for this song." }, { quoted: m });
    }
}
