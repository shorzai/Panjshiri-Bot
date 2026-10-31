import fs from "fs";

const path = "./data/shadow.json";

export default async function shadowclear(
  sock,
  from,
  body,
  m,
  args
){

  try{

    if(!fs.existsSync(path)){

      return await sock.sendMessage(from,{
        text:"❌ Shadow database پیدا نشد."
      });

    }


    const db = JSON.parse(
      fs.readFileSync(path,"utf8")
    );


    /*
     * گرفتن کاربر از منشن
     */
    const target =
      m.message
      ?.extendedTextMessage
      ?.contextInfo
      ?.mentionedJid
      ?.[0];


    /*
     * اگر منشن نشده بود،
     * شماره بعد از دستور را می‌گیرد
     */
    let jid = target;


    if(!jid && args[0]){

      const number =
        args[0].replace(/\D/g,"");

      if(number){

        jid =
          `${number}@s.whatsapp.net`;

      }

    }


    if(!jid){

      return await sock.sendMessage(from,{
        text:
`🌑 SHADOW CLEAR

📌 استفاده:

!shadowclear @user

یا:

!shadowclear 9379xxxxxxx`
      });

    }


    /*
     * بررسی وجود کاربر
     */
    if(!db.users?.[jid]){

      return await sock.sendMessage(from,{
        text:
`❌ کاربر در Shadow ثبت نشده.

👤 @${jid.split("@")[0]}`,
        mentions:[jid]
      });

    }


    /*
     * نگه‌داشتن تاریخ ایجاد
     * و صفر کردن آمار
     */
    const createdAt =
      db.users[jid].createdAt ||
      new Date().toISOString();


    db.users[jid] = {

      messages:0,

      today:0,

      xp:0,

      weeklyXP:0,

      level:1,

      rank:"🥉 NEWBIE",

      warnings:0,

      lastMessage:0,

      lastDate:"",

      createdAt

    };


    /*
     * ذخیره
     */
    fs.writeFileSync(
      path,
      JSON.stringify(db,null,2)
    );


    /*
     * تأیید
     */
    await sock.sendMessage(from,{
      text:
`
╭━━〔 🌑 SHADOW CLEAR 〕━━╮

✅ DATA CLEARED

👤 USER:
@${jid.split("@")[0]}

💬 Messages: 0
⭐ XP: 0
🏆 Level: 1
🎖 Rank: 🥉 NEWBIE
⚠️ Warnings: 0
📅 Weekly XP: 0

╰━━━━━━━━━━━━━━━━╯
`,
      mentions:[jid]
    });


  }catch(e){

    console.log(
      "SHADOW CLEAR ERROR:",
      e
    );

    await sock.sendMessage(from,{
      text:"❌ خطا در پاک‌سازی Shadow"
    });

  }

}