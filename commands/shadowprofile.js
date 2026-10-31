import fs from "fs";

const path = "./data/shadow.json";


export default async function profile(
sock,
from,
body,
m
){

try{


if(!fs.existsSync(path)){

return sock.sendMessage(from,{
text:"❌ Shadow data not found"
});

}


const db =
JSON.parse(
fs.readFileSync(path)
);



const user =
m.key.participant ||
m.key.remoteJid;



const data =
db.users?.[user];



if(!data){

return sock.sendMessage(from,{
text:
"📊 هنوز اطلاعاتی از شما ثبت نشده"
});

}



await sock.sendMessage(from,{
text:
`
╭━━〔 🌑 SHADOW PROFILE 〕━━╮

👤 USER:
@${user.split("@")[0]}

💬 TOTAL MESSAGES:
${data.messages}

⭐ XP:
${data.xp}

🏆 LEVEL:
${data.level}

👑 RANK:
${data.rank}

⚠️ WARN:
${data.warnings}

📅 TODAY:
${data.today}

🕒 LAST ACTIVE:
${new Date(data.lastMessage)
.toLocaleString("fa-IR")}

╰━━━━━━━━━━━━╯
`,
mentions:[user]
});



}catch(e){

console.log(
"PROFILE ERROR:",
e
);

}

}