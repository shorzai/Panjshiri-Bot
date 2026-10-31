import { getDB, saveDB } from "../lib/db.js";

const spamUsers = new Map();

export default async function antispam(
sock,
from,
body,
m
){

try{

if(!from.endsWith("@g.us")) return;

if(!body) return;


const user =
m.key.participant || from;



const meta =
await sock.groupMetadata(from);


// ادمین ها

const admins =
meta.participants
.filter(v=>v.admin)
.map(v=>v.id);


// ادمین رد شود

if(admins.includes(user)) return;



// اونر ربات رد شود

const db = getDB();

const owners = db.users || [];

if(
owners.includes(user) ||
owners.includes(user.split("@")[0])
) return;



const key =
`${from}:${user}`;



const now = Date.now();



if(!spamUsers.has(key)){

spamUsers.set(key,{
count:1,
warnings:0,
last:now
});

return;

}



let data =
spamUsers.get(key);



if(now - data.last < 5000){

data.count++;

}else{

data.count = 1;

}



data.last = now;

spamUsers.set(key,data);



// اخطار اول

if(data.count === 5){

data.warnings++;

spamUsers.set(key,data);


return sock.sendMessage(from,{

text:
`⚠️ اخطار اسپم

@${user.split("@")[0]}
پیام‌های زیاد نفرست.
اخطار ${data.warnings}/3`,

mentions:[user]

});

}



// اخطار دوم

if(data.count === 8){

data.warnings++;

spamUsers.set(key,data);


return sock.sendMessage(from,{

text:
`⚠️ اخطار دوم اسپم

@${user.split("@")[0]}
آخرین هشدار.
اخطار ${data.warnings}/3`,

mentions:[user]

});

}



// بار سوم = کیک

if(data.count >= 10){

await sock.sendMessage(from,{

text:
`🚫 اسپم ادامه پیدا کرد

@${user.split("@")[0]}
از گروه حذف شد.`,

mentions:[user]

});


await sock.groupParticipantsUpdate(
from,
[user],
"remove"
);


spamUsers.delete(key);

}



}catch(e){

console.log("ANTISPAM ERROR:",e);

}

}