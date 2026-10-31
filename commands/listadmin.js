// commands/listadmin.js

export default async function listadmin(sock, from){

try{


if(!from.endsWith("@g.us")){

return sock.sendMessage(from,{
text:"❌ فقط داخل گروه کار می‌کند"
});

}



const meta =
await sock.groupMetadata(from);



const admins =
meta.participants.filter(
p=>p.admin
);



let text =
`
╭━━━〔 👑 GROUP ADMINS 👑 〕━━━╮

📌 گروه:
${meta.subject}

👥 تعداد مدیران:
${admins.length}

━━━━━━━━━━━━━━━━

`;



let mentions = [];



for(let i=0;i<admins.length;i++){


const admin = admins[i];

const id = admin.id;

mentions.push(id);



let name =
admin.notify ||
id.split("@")[0];



text +=
`
${i+1}️⃣ 👑 ${name}

📱 شماره:
@${id.split("@")[0]}

🔰 سطح:
${
admin.admin === "superadmin"
?
"مالک گروه"
:
"مدیر"
}

━━━━━━━━━━━━
`;



}



text +=
`
🤖 RAEES SULTAN BOT
🟢 Admin Manager Active
`;




await sock.sendMessage(from,{

text,

mentions

});



}catch(e){

console.log(
"LISTADMIN ERROR:",
e
);


await sock.sendMessage(from,{
text:"❌ خطا در گرفتن لیست ادمین‌ها"
});


}

}