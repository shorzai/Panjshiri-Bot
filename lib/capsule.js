import { getDB, saveDB } from "./db.js";
import fs from "fs";

export default function capsuleRunner(sock) {
  setInterval(async () => {
    try {
      const db = getDB();
      if (!db.capsules || db.capsules.length === 0) return;

      const now = Date.now();
      const due = db.capsules.filter(c => c.sendAt <= now);

      if (due.length > 0) {
        for (const c of due) {
          try {
            if (c.type === "voice" && c.mediaPath && fs.existsSync(c.mediaPath)) {
              const buffer = fs.readFileSync(c.mediaPath);
              await sock.sendMessage(c.from, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
              fs.unlinkSync(c.mediaPath); // پاک کردن فایل بعد از ارسال
            } else if (c.text) {
              await sock.sendMessage(c.from, { text: `⏳ *کپسول زمان باز شد!*\n\nپیام از گذشته:\n"${c.text}"` });
            }
          } catch (err) {
            console.log(`CAPSULE SEND ERROR [${c.id}]:`, err.message);
          }
        }
        db.capsules = db.capsules.filter(c => c.sendAt > now);
        saveDB(db);
      }
    } catch (e) {
      console.log("CAPSULE RUNNER FATAL:", e.message);
    }
  }, 60000); // هر ۱ دقیقه
}