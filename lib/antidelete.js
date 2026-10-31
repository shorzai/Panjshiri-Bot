// lib/antidelete.js

import { getDB } from "./db.js";


const store = new Map();


export default async function antidelete(sock){


sock.ev.on(
"messages.upsert",
async({messages})=>{

try{


const db = getDB();


for(const m of messages){


if(!m.message) continue;


const id =
m.key.id;


const from =
m.key.remoteJid;



// ذخیره پیام‌ها

store.set(id,{
message:m.message,
sender:m.key.participant || from,
time:Date.now()
});



// پاکسازی پیام‌های قدیمی (۳۰ دقیقه)

for(const [key,value] of store){

if(
Date.now()-value.time > 1800000
){

store.delete(key);

}

}



}


// تشخیص حذف پیام

for(const m of messages){


if(
m.message?.protocolMessage?.type === 0
){


const deletedId =
m.message.protocolMessage.key.id;


const old =
store.get(deletedId);



if(!old) continue;



const chat =
m.key.remoteJid;



// بررسی فعال بودن

if(
!db.settings?.[chat]?.antidelete
) continue;



await sock.sendMessage(chat,{

text:
`
👀 Anti Delete

پیام حذف شده پیدا شد.

👤 فرستنده:
@${old.sender.split("@")[0]}

🛡 پیام بازیابی شد.
`,
mentions:[
old.sender
]

});



await sock.relayMessage(
chat,
old.message,
{
messageId:deletedId
}
);



}


}


}catch(e){

console.log(
"ANTI DELETE ERROR:",
e
);

}


});


}