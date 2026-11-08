import { tsun } from 'tsun-dls'; // نحوه import ممکنه متفاوت باشه

export default async function dl(sock, from, body, m, args) {
  if (!args[0]) return sock.sendMessage(from, { text: "لینک رو بفرست!" }, { quoted: m });
  
  const url = args[0];
  try {
    const result = await tsun(url); // تابع دانلود
    if (result.video) {
       await sock.sendMessage(from, { video: { url: result.video }, caption: "دانلود شد ✅" }, { quoted: m });
    }
  } catch (e) {
    console.log("DL ERROR:", e);
    sock.sendMessage(from, { text: "خطا در دانلود!" }, { quoted: m });
  }
}