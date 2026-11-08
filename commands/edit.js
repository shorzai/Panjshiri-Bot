import Jimp from "jimp";

export default async function edit(sock, from, body, m, args) {
    try {
        // 1. بررسی اینکه آیا کاربر روی یک عکس ریپلای کرده است یا نه
        const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = quotedMessage?.imageMessage;

        if (!imageMessage) {
            return await sock.sendMessage(from, {
                text: "⚠️ *لطفاً روی یک عکس ریپلای کنید و دستور را بزنید.*\n\n" +
                      "مثال:\n" +
                      "!edit gray (خاکستری)\n" +
                      "!edit blur (تار)\n" +
                      "!edit invert (معکوس کردن رنگ‌ها)\n" +
                      "!edit sepia (قدیمی)\n" +
                      "!edit flip (آینه‌ای)\n" +
                      "!edit rotate (چرخش ۹۰ درجه)"
            }, { quoted: m });
        }

        const effect = args[0]?.toLowerCase();

        if (!effect) {
            return await sock.sendMessage(from, {
                text: "⚠️ *لطفاً نوع افکت را وارد کنید.*\nمثال: !edit gray"
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "🎨 در حال پردازش عکس..." }, { quoted: m });

        // 2. دانلود عکس ریپلای شده
        const stream = await sock.downloadMediaMessage({
            message: { imageMessage }
        });

        // 3. پردازش عکس با Jimp
        const image = await Jimp.read(stream);

        switch (effect) {
            case "gray":
            case "خاکستری":
                image.grayscale();
                break;
            case "blur":
            case "تار":
                image.blur(10); // عدد 10 میزان تاری است
                break;
            case "invert":
            case "معکوس":
                image.invert();
                break;
            case "sepia":
            case "قدیمی":
                image.sepia();
                break;
            case "flip":
            case "آینه":
                image.flip(true, false); // افقی
                break;
            case "rotate":
            case "چرخش":
                image.rotate(90);
                break;
            case "resize":
                image.resize(500, Jimp.AUTO);
                break;
            default:
                return await sock.sendMessage(from, {
                    text: "❌ افکت نامعتبر است. از افکت‌های gray, blur, invert, sepia, flip, rotate استفاده کنید."
                }, { quoted: m });
        }

        // 4. تبدیل عکس ادیت شده به بافر
        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

        // 5. ارسال عکس جدید
        await sock.sendMessage(from, {
            image: buffer,
            caption: `✅ عکس شما با افکت *${effect}* ویرایش شد.`
        }, { quoted: m });

    } catch (error) {
        console.log("EDIT IMAGE ERROR:", error);
        await sock.sendMessage(from, {
            text: "❌ متأسفانه در پردازش عکس خطایی رخ داد."
        }, { quoted: m });
    }
}