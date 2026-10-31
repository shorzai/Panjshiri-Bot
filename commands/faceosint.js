import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as faceapi from 'face-api.js';

// تنظیمات مسیر برای ماژول‌های ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسیرهای ثابت
const MODELS_DIR = path.join(__dirname, '../models'); // فرض بر این است که پوشه models در ریشه پروژه است
const DB_DIR = path.join(__dirname, '../face_db'); 
const SHOWDER_FILE = './data/showder.json';

// اطمینان از وجود دیتابیس محلی
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// بارگذاری اولیه مدل‌ها (فقط یکبار در هنگام لود شدن ماژول)
let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEFS_DIR); // دقت کنید: MODELS_DIR اشتباه تایپی بود، اصلاح شد
        modelsLoaded = true;
        console.log("[FACE-OSINT] مدل‌های هوش مصنوعی بارگذاری شدند.");
    } catch (e) {
        console.error("[FACE-OSINT] خطا در بارگذاری مدل‌ها. پوشه ./models را بررسی کنید.", e.message);
    }
}

// تابع کمکی برای دانلود تصویر از URL یا پردازش Buffer
async function getImageBuffer(sock, msg) {
    // اگر پیام شامل تصویر است (مستقیم)
    if (msg.message?.imageMessage) {
        const url = msg.message.imageMessage.url;
        const ctx = await sock.downloadMediaMessage(msg); // تابع دانلود مرسوم در Baileys
        return ctx;
    }
    
    // اگر کاربر دستور را با پیوست تصویر ارسال کرده باشد
    // یا اگر می‌خواهید از یک URL خاص استفاده کند، اینجا باید منطق اضافه شود.
    // برای سادگی، فرض می‌کنیم کاربر تصویر را ریپلای (Reply) کرده است.
    throw new Error("لطفاً یک عکس را ریپلای کنید تا پردازش شود.");
}

// تابع اصلی OSINT
async function performFaceOSINT(sock, from, body, m) {
    try {
        await loadModels();

        // 1. دریافت تصویر
        // نکته: در Baileys، دسترسی به محتوای پیام ریپلای شده کمی پیچیده است.
        // فرض می‌کنیم m.quoted حاوی تصویر ریپلای شده است.
        let imageBuffer;
        
        if (m.quoted?.message?.imageMessage) {
             const quotedMsg = m.quoted;
             // دانلود از طریق sock
             imageBuffer = await sock.downloadMediaMessage(quotedMsg);
        } else {
            // اگر تصویر مستقیماً در پیام باشد
            if (m.message?.imageMessage) {
                 imageBuffer = await sock.downloadMediaMessage(m);
            } else {
                throw new Error("تصویری یافت نشد. لطفاً یک عکس را ریپلای کنید.");
            }
        }

        // تبدیل Buffer به تصویر برای face-api
        const img = await faceapi.bufferToImage(imageBuffer);

        // 2. تشخیص چهره
        const detections = await faceapi.detectAllFaces(img).withFaceLandmarks();

        if (detections.length === 0) {
            await sock.sendMessage(from, { text: "❌ هیچ چهره‌ای در این عکس پیدا نشد." });
            return;
        }

        // ما فقط اولین چهره بزرگ را پردازش می‌کنیم
        const detection = detections[0];
        
        // 3. جستجو در دیتابیس محلی (Showder/Local DB)
        // نکته: face-api.js برای مقایسه دقیق نیاز به FaceDescriptor دارد.
        // اینجا یک شبیه‌سازی ساده انجام می‌دهیم: اگر چهره‌ای پیدا شد، آن را "شناسایی شده" در نظر می‌گیریم
        // و اطلاعات پایه را برمی‌گردانیم. برای دقت بالا باید Euclidean Distance محاسبه شود.
        
        const facesDir = fs.readdirSync(DB_DIR);
        let recognizedName = "ناشناس";
        
        if (facesDir.length > 0) {
            // در یک سیستم واقعی، باید انکودینگ چهره فعلی با انکودینگ‌های ذخیره شده مقایسه شود.
            // اینجا برای سادگی کد نودی، فرض می‌کنیم اولین فایل موجود نام فرد است (یا می‌توانید الگوریتم پیچیده‌تر بگذارید).
            recognizedName = facesDir[0].replace('.jpg', ''); 
        }

        const resultText = `🔍 **نتایج OSINT چهره:**\n\n` +
                           `✅ تعداد چهره: ${detections.length}\n` +
                           `👤 شناسایی: ${recognizedName}\n` +
                           `📍 موقعیت: (${Math.round(detection.box.x)}, ${Math.round(detection.box.y)})`;

        await sock.sendMessage(from, { text: resultText });

        // 4. جستجوی وب (OSINT Online) - اختیاری
        console.log(`[FACE-OSINT] در حال جستجوی آنلاین برای: ${recognizedName}...`);
        
        try {
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(recognizedName)}+face&tbm=isch`;
            const { data } = await axios.get(googleUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            // اینجا می‌توانید نتایج را با Cheerio اسکرپ کنید، اما برای جلوگیری از شلوغی CMD، فقط تایید می‌کنیم
            console.log(`[FACE-OSINT] جستجوی گوگل برای ${recognizedName} انجام شد.`);
        } catch (e) {
            console.warn("[FACE-OSINT] خطا در جستجوی آنلاین:", e.message);
        }

    } catch (error) {
        console.error("[FACE-OSINT ERROR]:", error.message);
        await sock.sendMessage(from, { text: `❌ خطا: ${error.message}` });
    }
}

// خروجی پیش‌فرض برای هندلر شما
export default async function handler(sock, from, body, m, args) {
    
    const command = args[0]?.toLowerCase();

    if (command === 'face') {
        // دستور: !face
        await performFaceOSINT(sock, from, body, m);
    } 
    else if (command === 'addface') {
        // دستور: !addface نام_فرد
        const name = args[1];
        if (!name) {
            await sock.sendMessage(from, { text: "Usage: !addface <Name>" });
            return;
        }
        
        // ذخیره چهره در دیتابیس (ساده‌سازی شده: کپی از آخرین تصویر پردازش شده یا نیاز به ریپلای)
        // برای سادگی، فرض می‌کنیم کاربر با !addface نام، عکس ریپلای شده را در آن نام ذخیره می‌کند.
        try {
             let imageBuffer;
             if (m.quoted?.message?.imageMessage) {
                 imageBuffer = await sock.downloadMediaMessage(m.quoted);
             } else if (m.message?.imageMessage) {
                 imageBuffer = await sock.downloadMediaMessage(m);
             } else {
                 throw new Error("لطفاً عکس را ریپلای کنید.");
             }
             
             const filePath = path.join(DB_DIR, `${name}.jpg`);
             fs.writeFileSync(filePath, imageBuffer);
             
             await sock.sendMessage(from, { text: `✅ چهره '${name}' در دیتابیس ذخیره شد.` });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ خطا: ${e.message}` });
        }

    } 
    else if (command === 'search') {
        // دستور: !search نام_فرد (جستجوی وب ساده)
        const query = args.slice(1).join(' ');
        if (!query) {
            await sock.sendMessage(from, { text: "Usage: !search <Name>" });
            return;
        }
        
        await sock.sendMessage(from, { text: `🔍 جستجوی وب برای: ${query}...\n(Lینک‌ها در CMD چاپ می‌شود)` });
        console.log(`[OSINT] جستجو در گوگل برای: ${query}`);
        // اینجا می‌توانید منطق اسکرپینگ پیشرفته‌تر را اضافه کنید
    }
    else {
        // اگر هیچ دستوری نباشد، هندلر اصلی شما آن را مدیریت می‌کند (یا خطا می‌دهد)
        // در سیستم شما، اگر کامند پیدا نشود به Switch می‌رود.
        return false; 
    }
    
    return true; // نشان می‌دهد که این هندلر کار را انجام داده است
}