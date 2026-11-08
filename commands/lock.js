export default async function lock(sock, from, body, m) {
    try {
        if (!from.endsWith('@g.us')) return;
        
        // تغییر تنظیمات گروه به حالت "فقط ادمین‌ها"
        await sock.groupSettingUpdate(from, 'announcement');
        
        await sock.sendMessage(from, { react: { text: "🔒", key: m.key } });
        await sock.sendMessage(from, { text: "🔒 *گروه قفل شد.*\nاز این به بعد فقط ادمین‌ها می‌توانند پیام بفرستند." });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { text: "❌ خطا! مطمئن شوید ربات ادمین است." }, { quoted: m });
    }
}