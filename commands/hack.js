export default async function hack(sock, from, body, m) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const target = contextInfo?.participant || contextInfo?.mentionedJid?.[0];

    if (!target) {
        return await sock.sendMessage(from, { text: "⚠️ *روی پیام یک نفر ریپلای کنید یا منشنش کنید تا هکش کنیم!*" }, { quoted: m });
    }

    const targetNumber = target.split('@')[0];
    await sock.sendMessage(from, { text: `🔍 *Initiating Cyber Attack on +${targetNumber}...*` }, { quoted: m });

    const steps = [
        `[1/4] Bypassing WhatsApp End-to-End Encryption... 🔓`,
        `[2/4] Connecting to Target Server (IP: 192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)})... 🌐`,
        `[3/4] Extracting Data: Photos, Messages, Contacts... 📂`,
        `[4/4] Downloading Payload... 💾`
    ];

    for (const step of steps) {
        await new Promise(r => setTimeout(r, 1500));
        await sock.sendMessage(from, { text: step });
    }

    await new Promise(r => setTimeout(r, 1500));
    await sock.sendMessage(from, { 
        text: `✅ *HACK COMPLETED SUCCESSFULLY!*\n\n⚠️ *اطلاعات @${targetNumber} با موفقیت استخراج شد.*\n\n😂 شوخی کردم رفیق! ما ربات هکر نیستیم!`,
        mentions: [target]
    }, { quoted: m });
}
