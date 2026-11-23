export default async function kick(sock, from, body, m, args) {
    try {
        // 🚨 1. بررسی اینکه آیا در گروه هستیم یا نه
        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, { 
                text: "❌ این دستور فقط در گروه‌ها قابل اجراست." 
            }, { quoted: m });
        }

        // 🚨 2. پیدا کردن هدف (ریپلای، منشن، یا شماره)
        let target = "";
        const contextInfo = m.message?.extendedTextMessage?.contextInfo;

        if (contextInfo?.participant) {
            // حالت اول: ریپلای روی پیام کاربر
            target = contextInfo.participant;
        } else if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
            // حالت دوم: منشن کردن کاربر
            target = contextInfo.mentionedJid[0];
        } else if (args[0]) {
            // حالت سوم: وارد کردن شماره (مثلاً 93794384087)
            let number = args[0].replace(/[^0-9]/g, "");
            if (number.length >= 10) {
                target = number + "@s.whatsapp.net";
            }
        }

        if (!target) {
            return await sock.sendMessage(from, { 
                text: "⚠️ *روش استفاده:*\n\n1️⃣ روی پیام کاربر ریپلای کنید و بنویسید !kick\n2️⃣ کاربر را منشن کنید: !kick @user\n3️⃣ شماره کاربر را وارد کنید: !kick 93794384087" 
            }, { quoted: m });
        }

        // 🚨 3. بررسی اینکه ربات خودش را اخراج نکند
        const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        if (target === botJid) {
            return await sock.sendMessage(from, { 
                text: "❌ من نمی‌توانم خودم را اخراج کنم! 😅" 
            }, { quoted: m });
        }

        // 🚨 4. اجرای دستور اخراج
        await sock.groupParticipantsUpdate(from, [target], "remove");
        
        // 🚨 5. پیام موفقیت
        await sock.sendMessage(from, { 
            text: `✅ کاربر @${target.split("@")[0]} با موفقیت از گروه اخراج شد.`,
            mentions: [target]
        }, { quoted: m });

    } catch (error) {
        console.error("KICK COMMAND ERROR:", error);
        await sock.sendMessage(from, { 
            text: "❌ خطا در اخراج کاربر.\n\n📌 *دلایل احتمالی:*\n- من ادمین نیستم.\n- کاربر ادمین است.\n- شماره وارد شده در گروه نیست." 
        }, { quoted: m });
    }
}
