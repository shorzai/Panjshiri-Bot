import axios from "axios";

export default async function dict(sock, from, body, m, args) {
    try {
        const word = args[0]?.toLowerCase();
        if (!word) {
            return await sock.sendMessage(from, { text: "📖 *Dictionary*\n\nمثال:\n!dict hello\n!dict computer" }, { quoted: m });
        }

        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = res.data[0];

        if (!data) throw new Error("Not found");

        const meaning = data.meanings[0];
        const definition = meaning.definitions[0].definition;
        const example = meaning.definitions[0].example || "ندارد";
        const partOfSpeech = meaning.partOfSpeech;

        const text = `📖 *${data.word}*\n\n` +
                     `🔊 *تلفظ:* ${data.phonetic || "نامشخص"}\n` +
                     `📝 *نوع کلمه:* ${partOfSpeech}\n\n` +
                     `📚 *معنی:* \n${definition}\n\n` +
                     `✍️ *مثال:* \n${example}`;

        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ کلمه مورد نظر در دیکشنری پیدا نشد." }, { quoted: m });
    }
}
