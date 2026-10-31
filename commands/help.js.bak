import fs from "fs";
import path from "path";

export default async function help(sock, from, body, m){

try{

let imagePath = "./sultan/help.jpg";

const prefix = "!";

// 📦 خواندن خودکار دستورات از فولدر commands
const cmdPath = "./commands";
const files = fs.readdirSync(cmdPath)
.filter(f => f.endsWith(".js"))
.map(f => f.replace(".js",""));

// دسته‌بندی دستی (برای زیبایی)
const ai = ["ai","ai-lite","gpt","ask"];
const group = ["add","addall","kick","promote","demote","tagall"];
const sec = ["antiforeign","autoclear","antiemoji","antiimage","antivideo","antiaudio"];
const econ = ["balance","daily","gamble","rank","level"];
const fun = ["joke","roast","love","quote","dice","fakereply"];
const sys = ["ping","alive","time","device","check","whois"];
const admin = ["broadcast","invite","join","block","unblock"];

// helper
const format = (arr) =>
arr.filter(c => files.includes(c))
.map(c => `┃ • ${prefix}${c}`)
.join("\n");

const menu = `
╭━━〔 👑 SUPER HELP MENU 👑 〕━━╮

📌 HOW TO USE:
💡 ${prefix}command text

━━━━━━━━━━━━━━━━━━━━━━

🤖 AI SYSTEM
${format(ai)}

━━━━━━━━━━━━━━━━━━━━━━

👥 GROUP SYSTEM
${format(group)}

━━━━━━━━━━━━━━━━━━━━━━

🔐 SECURITY SYSTEM
${format(sec)}

━━━━━━━━━━━━━━━━━━━━━━

💰 ECONOMY SYSTEM
${format(econ)}

━━━━━━━━━━━━━━━━━━━━━━

😂 FUN SYSTEM
${format(fun)}

━━━━━━━━━━━━━━━━━━━━━━

🛠 SYSTEM TOOLS
${format(sys)}

━━━━━━━━━━━━━━━━━━━━━━

👑 ADMIN TOOLS
${format(admin)}

━━━━━━━━━━━━━━━━━━━━━━

⚡ INFO:
✔ Commands auto-loaded
✔ Prefix: ${prefix}
✔ Some commands need admin

╰━━━━━━━━━━━━━━━━━━━━━━╯

👑 RAEES SULTAN BOT
`;

await sock.sendMessage(from,{
image: fs.readFileSync(imagePath),
caption: menu,
contextInfo:{
forwardingScore:999,
isForwarded:true,
forwardedNewsletterMessageInfo:{
newsletterName:"👑 RAEES SULTAN BOT",
newsletterJid:"120363000000000000@newsletter",
serverMessageId:1
}
}
});

}catch(e){

console.log("SUPER HELP ERROR:", e);

await sock.sendMessage(from,{
text:"❌ help error"
});

}

}