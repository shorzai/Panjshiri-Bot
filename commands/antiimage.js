import { getDB, saveDB } from "../lib/db.js";

export default async function antiimage(
sock,
from,
body,
m,
args
){

try{

if(!from.endsWith("@g.us")) return;



let db = getDB();

db.groups ??= {};



// روشن کردن

if(args[0] === "on"){

db.groups[from] ??= {};

db.groups[from].antiimage = true;

db.groups[from].imageWarn ??= {};

saveDB(db);


return sock.sendMessage(from,{
text:"✅ ANTI IMAGE فعال شد"
});

}



// خاموش کردن

if(args[0] === "off"){

if(db.groups[from]){

db.groups[from].antiimage = false;

saveDB(db);

}


return sock.sendMessage(from,{
text:"❌ ANTI IMAGE خاموش شد"
});

}



// بررسی فعال بودن

if(!db.groups?.[from]?.antiimage) return;



// فقط عکس

if(!m.message?.imageMessage) return;



const sender =
m.key.participant || from;



const meta =
await sock.groupMetadata(from);



// ادمین ها

const admins =
meta.participants
.filter(v=>v.admin)
.map(v=>v.id);



// ادمین رد شود

if(admins.includes(sender)) return;



// اونر رد شود

const owners =
db.users || [];

if(
owners.includes(sender) ||
owners.includes(sender.split("@")[0])
) return;



// حذف عکس

await sock.sendMessage(from,{
delete:m.key
});



// شمارش هشدار

db.groups[from].imageWarn ??= {};

db.groups[from].imageWarn[sender] ??= 0;

db.groups[from].imageWarn[sender]++;


saveDB(db);



// پیام هشدار

await sock.sendMessage(from,{

text:
`⚠️ عکس ممنوع است

@${sender.split("@")[0]}
این تصویر حذف شد.
تخلف: ${db.groups[from].imageWarn[sender]}/3`,

mentions:[sender]

});



}catch(e){

console.log("ANTI IMAGE ERROR:",e);

}

}