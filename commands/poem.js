import axios from "axios";

export default async function poem(sock, from, body, m) {
    try {
        await sock.sendMessage(from, { text: "📜 Fetching a beautiful poem..." }, { quoted: m });

        // Using a free Persian poetry API
        const res = await axios.get("https://api.codebazan.ir/hafez/", { timeout: 15000 });
        
        if (!res.data || !res.data.result) throw new Error("No poem found.");

        const poemText = `📜 *Poem of the Day*\n\n${res.data.result}\n\n👑 RAEES SULTAN BOT`;

        await sock.sendMessage(from, { text: poemText }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ Error fetching poem." }, { quoted: m });
    }
}
