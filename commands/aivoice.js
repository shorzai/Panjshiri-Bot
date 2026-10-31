import axios from "axios";
import googleTTS from "google-tts-api";

// تابع برای شکستن متن‌های طولانی و ترکیب صدا
async function generateLongTTS(text, lang = 'fa') {
  const chunks = [];
  const words = text.split(" ");
  let current = "";
  
  for (const word of words) {
    if ((current + " " + word).length > 180) {
      chunks.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const buffers = [];
  for (const chunk of chunks) {
    const base64 = await googleTTS.getAudioBase64(chunk, { lang, slow: false, host: 'https://translate.google.com' });
    buffers.push(Buffer.from(base64, 'base64'));
  }
  return Buffer.concat(buffers);
}

export default async function aivoice(sock, from, body, m, args) {
  if (!args.length) return sock.sendMessage(from, { text: "📌 استفاده: !voice سلام حالت چطوره؟\nیا: !voice en Hello how are you?" }, { quoted: m });

  let lang = 'fa';
  let prompt = args.join(" ");
  
  if (args[0] === 'en' || args[0] === 'ar') {
    lang = args[0];
    prompt = args.slice(1).join(" ");
  }

  const loading = await sock.sendMessage(from, { text: "🧠 در حال فکر کردن و تولید صدا..." }, { quoted: m });

  try {
    const aiRes = await axios.get(`https://api.siputzx.my.id/api/ai/gemini?text=${encodeURIComponent(prompt)}`, { timeout: 15000 });
    let aiText = aiRes.data?.data?.answer || aiRes.data?.result || "متاسفم، پاسخی پیدا نکردم.";
    
    // حذف کاراکترهای اضافی مارک‌داون که توی صدا خونده میشن
    aiText = aiText.replace(/[*_`#]/g, '');

    const audioBuffer = await generateLongTTS(aiText, lang);

    await sock.sendMessage(from, { text: `🤖 *پاسخ AI:*\n${aiText}`, edit: loading.key }, { quoted: m });
    await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: true }, { quoted: m });

  } catch (e) {
    console.log("AIVOICE ERROR:", e);
    await sock.sendMessage(from, { text: `❌ خطا در پردازش صوتی.`, edit: loading.key });
  }
}