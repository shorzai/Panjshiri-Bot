// lib/antibot.js

import { getDB } from "./db.js";

export default async function antibot(sock){

sock.ev.on(
"group-participants.update",
async(data)=>{

try{


if(data.action !== "add") return;


const db = getDB();


if(
!db.settings?.[data.id]?.antibot
) return;



const group =
await sock.groupMetadata(data.id);



for(const user of data.participants){


const info =
group.participants.find(
p=>p.id===user
);


if(!info) continue;



const number =
user.split("@")[0];



const name =
info.notify ||
"";



const isBot =
name.toLowerCase().includes("bot") ||
name.toLowerCase().includes("wa.me") ||
name.toLowerCase().includes("api") ||
number.length < 8;



if(isBot){


await sock.groupParticipantsUpdate(
data.id,
[user],
"remove"
);



await sock.sendMessage(data.id,{
text:
`
🤖 AntiBot

یک حساب مشکوک حذف شد.

👤 کاربر:
@${number}

🛡 امنیت گروه فعال است.
`,
mentions:[user]
});


console.log(
"ANTI BOT REMOVED:",
user
);


}


}



}catch(e){

console.log(
"ANTIBOT ERROR:",
e
);

}


});

}