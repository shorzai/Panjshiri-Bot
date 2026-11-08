import QRCode from 'qrcode';

export default async function qr(sock, from, body, m, args) {
    try {
        const text = args.join(' ');
        
        if (!text) {
            return sock.sendMessage(from, { 
                text: "📌 روش استفاده: !qr لینک یا متن شما\nمثال: !qr https://google.com" 
            }, { quoted: m });
        }

        // تبدیل متن به بافر عکس QR
        const qrBuffer = await QRCode.toBuffer(text, {
            color: { dark: '#000000', light: '#ffffff' },
            width: 500
        });

        await sock.sendMessage(from, { 
            image: qrBuffer, 
            caption: `✅ *کیو آر کد ساخته شد*\n\nمتن: ${text}` 
        }, { quoted: m });

        await sock.sendMessage(from, { react: { text: "🏷️", key: m.key } });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { text: "❌ خطا در ساخت QR." }, { quoted: m });
    }
}