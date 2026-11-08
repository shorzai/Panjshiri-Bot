import chalk from "chalk";
import { MongoClient } from "mongodb";

export default async function promoteBot(sock, phoneNumber) {
    try {
        // 📝 متن تبلیغاتی جدید با لینک کانال و شماره تماس شما
        const adMessage = `╭────────────────────────╮
   🤖 *ربات سلطان شیرزی شتلی* 🤖
╰────────────────────────╯

سلام! 👋 من یک ربات فوق‌العاده قدرتمند و هوشمند هستم.
✨ بیش از ۱۶۰ دستور کاربردی
📥 دانلود از یوتیوب، اینستاگرام و تیک‌تاک
🧠 هوش مصنوعی پیشرفته
🎮 بازی‌های گروهی و سرگرمی

🔗 *لینک اتصال به ربات (وب‌سایت):*
https://raees-sultan-bot.onrender.com

📢 *کانال رسمی ما در واتساپ:*
https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H

📞 *پشتیبانی و ارتباط با سازنده:*
wa.me/93794384087

👑 سازنده: *سلطان شیرزی*`;

        // ==========================================
        // ۱. ارسال استوری (Status) برای مخاطبین کاربر
        // ==========================================
        try {
            await sock.sendMessage("status@broadcast", { 
                text: adMessage,
                backgroundColor: "#128C7E", // رنگ پس‌زمینه سبز واتساپی
                font: 2
            });
            console.log(chalk.green(`✅ Status posted successfully for ${phoneNumber}`));
        } catch (e) {
            console.log(chalk.yellow("⚠️ Failed to post status:", e.message));
        }

        // ==========================================
        // ۲. ارسال به گروه‌ها (فقط یک بار برای هر گروه)
        // ==========================================
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.log(chalk.yellow("⚠️ No MONGO_URI found, skipping group ads."));
            return;
        }

        // اتصال به دیتابیس برای ذخیره گروه‌هایی که پیام گرفتن
        const client = new MongoClient(mongoUri);
        await client.connect();
        const collection = client.db("raees_bot").collection("promoted_groups");

        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        
        let sentCount = 0;

        for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];
            const groupData = groups[groupId];

            // چک کردن اینکه آیا قبلاً به این گروه پیام دادیم یا نه؟
            const alreadyPromoted = await collection.findOne({ groupId: groupId });
            if (alreadyPromoted) {
                continue; // اگر قبلاً پیام داده، کلاً رد شو (دیگه هیچوقت نمی‌فرسته)
            }

            // بررسی اینکه آیا کاربر ادمین این گروه هست یا نه
            const myJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const isAdmin = groupData.participants.some(
                p => p.id === myJid && (p.admin === "admin" || p.admin === "superadmin")
            );

            if (isAdmin) {
                try {
                    await sock.sendMessage(groupId, { text: adMessage });
                    console.log(chalk.green(`✅ Ad sent ONCE to group: ${groupData.subject}`));
                    
                    // ذخیره در دیتابیس که دیگه به این گروه پیام نفرسته
                    await collection.insertOne({ groupId: groupId, date: new Date() });
                    
                    sentCount++;

                    // تاخیر ۱۰ تا ۲۰ ثانیه‌ای بین گروه‌ها برای امنیت و جلوگیری از بن
                    if (sentCount < 5) {
                        const delay = Math.floor(Math.random() * 10000) + 10000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                } catch (err) {
                    console.log(chalk.red(`❌ Failed to send to ${groupData.subject}`));
                }
            }
        }

        await client.close();
        console.log(chalk.cyan(`📊 Promotion finished. Sent to ${sentCount} new groups.`));

    } catch (error) {
        console.log(chalk.red("PROMOTE ERROR:", error.message));
    }
}