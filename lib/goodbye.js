// lib/goodbye.js

export default function goodbye(sock){

sock.ev.on(
"group-participants.update",
async(data)=>{

try{


if(data.action !== "remove")
return;



const group =
await sock.groupMetadata(data.id);



const user =
data.participants[0];



const name =
user.split("@")[0];



const total =
group.participants.length;



await sock.sendMessage(data.id,{
text:
`
╭━━━〔 💀 خداحافظی 〕━━━╮

👤 کاربر:
@${name}

از گروه:
📌 ${group.subject}

خارج شد.

━━━━━━━━━━━━

👥 اعضای باقی مانده:
${total}

🤖 وضعیت ربات:
🟢 فعال

امیدواریم دوباره ببینیمت ❤️

╰━━━━━━━━━━━━╯
`,
mentions:[
user
]

});



}catch(e){

console.log(
"GOODBYE ERROR:",
e
);

}


});

}