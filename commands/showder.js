import fs from "fs";

const showderFile = "./data/showder.json";

const OWNER = "93794384087@s.whatsapp.net";


// =======================
// AUTO LEARN MEMORY
// =======================

const pending = new Map();


// =======================
// LOAD
// =======================

function load(){

if(!fs.existsSync(showderFile)){

fs.mkdirSync("./data",{recursive:true});

fs.writeFileSync(
showderFile,
JSON.stringify({
private:{},
group:{},
_status:true
},null,2)
);

}

return JSON.parse(
fs.readFileSync(showderFile,"utf8")
);

}


// =======================
// SAVE
// =======================

function save(data){

fs.writeFileSync(
showderFile,
JSON.stringify(data,null,2)
);

}


// =======================
// GET CHAT TYPE
// =======================

function getType(from){

return from.endsWith("@g.us")
? "group"
: "private";

}


// =======================
// GET SENDER
// =======================

function getSender(m,from){

if(from.endsWith("@g.us")){

return m.key.participant || m.key.remoteJid;

}

return m.key.remoteJid;

}


// =======================
// AUTO LEARN
// =======================

export async function showderLearn(
sock,
from,
body,
m
){

if(!body) return;

const data = load();


// خاموش باشد
if(data._status === false) return;


// دستورها یاد گرفته نشوند
if(body.startsWith("!")) return;


// پیام خود ربات یاد گرفته نشود
if(m.key.fromMe) return;


const type = getType(from);

const sender = getSender(m,from);


// =======================
// AUTO REPLY
// =======================

const memory = data[type]?.[body];

if(memory){

if(memory.answer){

await sock.sendMessage(
from,
{
text: memory.answer
},
{
quoted:m
}
);

return {
replied:true
};

}

}


// =======================
// LEARNING
// =======================

const old = pending.get(from);


// اگر پیام قبلی از شخص دیگری بوده
if(
old &&
old.sender !== sender &&
old.text !== body
){

if(!data[type]){

data[type] = {};

}


data[type][old.text] = {

answer: body,

from: sender,

timestamp: Date.now()

};


save(data);

pending.delete(from);

return {
learned:true
};

}


// پیام فعلی را نگه می‌داریم
pending.set(
from,
{
text:body,
sender:sender,
timestamp:Date.now()
}
);


return {
learned:false
};

}


// =======================
// SHOWDER COMMAND
// =======================

export default async function showder(
sock,
from,
body,
m,
args
){


// =======================
// OWNER CHECK
// =======================

if(
m.key.participant &&
m.key.participant !== OWNER &&
from !== OWNER
){

return sock.sendMessage(
from,
{
text:"❌ فقط مالک ربات اجازه دارد."
},
{
quoted:m
}
);

}


// =======================
// SUB COMMAND
// =======================

const sub =
args[0]?.toLowerCase();


const data = load();


switch(sub){


// =======================
// ON
// =======================

case "on":

data._status = true;

save(data);


await sock.sendMessage(
from,
{
text:"✅ Showder فعال شد."
},
{
quoted:m
}
);

break;


// =======================
// OFF
// =======================

case "off":

data._status = false;

save(data);


await sock.sendMessage(
from,
{
text:"⛔ Showder خاموش شد."
},
{
quoted:m
}
);

break;


// =======================
// STATUS
// =======================

case "status":


await sock.sendMessage(
from,
{
text:
data._status !== false
?
"🟢 Showder روشن است"
:
"🔴 Showder خاموش است"
},
{
quoted:m
}
);


break;


// =======================
// LIST
// =======================

case "list":


await sock.sendMessage(
from,
{
text:
JSON.stringify(data,null,2).slice(0,4000)
},
{
quoted:m
}
);


break;


// =======================
// CLEAR
// =======================

case "clear":


save({
private:{},
group:{},
_status:true
});


await sock.sendMessage(
from,
{
text:"🗑️ حافظه Showder پاک شد."
},
{
quoted:m
}
);


break;


// =======================
// DEFAULT
// =======================

default:


await sock.sendMessage(
from,
{
text:
`🧠 Showder Menu

!showder on
!showder off
!showder status
!showder list
!showder clear`
},
{
quoted:m
}
);


}

}