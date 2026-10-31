import fs from "fs";

export default async function help(sock, from, body, m){

try{


const imagePath = "./sultan/help.jpg";

const prefix = "!";

const cmdPath = "./commands";

const files =
fs.readdirSync(cmdPath)
.filter(f=>f.endsWith(".js"))
.map(f=>f.replace(".js",""))
.sort();



const categories = {

"🤖 AI SYSTEM":[
"ai",
"ai-lite",
"gpt",
"ask",
"translate",
"search"
],


"👥 GROUP SYSTEM":[
"add",
"addall",
"kick",
"promote",
"demote",
"tagall",
"welcome",
"goodbye"
],


"🛡 SECURITY SYSTEM":[
"anticall",
"antidelete",
"antidelete2",
"antibot",
"antilink",
"antispam",
"antiimage",
"antivideo",
"antiaudio"
],


"💰 ECONOMY SYSTEM":[
"balance",
"daily",
"gamble",
"rank",
"level"
],


"🎮 FUN SYSTEM":[
"joke",
"roast",
"love",
"quote",
"dice",
"fakereply",
"mafia"
],


"⚙️ SYSTEM TOOLS":[
"ping",
"alive",
"time",
"device",
"whois",
"stats",
"menu"
],


"👑 OWNER TOOLS":[
"broadcast",
"join",
"block",
"unblock",
"eval"
]

};




let text = `
╭━━━〔 👑 RAEES SULTAN BOT 👑 〕━━━╮

⚡ HELP CENTER V2

📌 Prefix:
${prefix}

📚 Total Commands:
${files.length}

━━━━━━━━━━━━━━━━━━━━
`;



for(const [title,list] of Object.entries(categories)){


const cmds =
list
.filter(c=>files.includes(c))
.map(c=>`┃ ⚡ ${prefix}${c}`)
.join("\n");



if(cmds){

text +=
`
${title}

${cmds}

━━━━━━━━━━━━━━━━━━━━
`;

}


}




text +=
`
💎 FEATURES:

✅ Auto Command Loader
✅ Anti Systems
✅ AI Assistant
✅ Group Manager
✅ Economy System
✅ Mafia Game
✅ Owner Control

🤖 Status:
🟢 ONLINE

╰━━━━━━━━━━━━━━━━━━━━╯

👑 RAEES SULTAN BOT
`;




await sock.sendMessage(from,{

image:
fs.readFileSync(imagePath),

caption:text,

contextInfo:{

forwardingScore:999,

isForwarded:true,


externalAdReply:{

title:"👑 RAEES SULTAN BOT",

body:
`⚡ ${files.length} Commands Active`,

thumbnail:
fs.readFileSync(imagePath),

sourceUrl:"https://whatsapp.com"

}

}

});



}catch(e){

console.log(
"SUPER HELP ERROR:",
e
);


await sock.sendMessage(from,{
text:"❌ Help system error"
});


}

}