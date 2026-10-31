const antiBad = {};

const bads = [
"بچی خر",
"ننیته گایم",
"کص خوارت",
"کوص مادر",
"کیرم ده کونت",
"fuck",
"bitch"
];


const warns = {};



export default async function antibad(
sock,
from,
body,
m,
args
){

try{


// ON

if(args[0] === "on"){

antiBad[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI BADWORD ON"
});

}


// OFF

if(args[0] === "off"){

antiBad[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI BADWORD OFF"
});

}



if(!antiBad[from]) return;



const text =
(body || "").toLowerCase();



const bad =
bads.find(v=>text.includes(v));



if(!bad) return;



const sender =
m.key.participant || from;



// گرفتن اطلاعات گروه

const metadata =
await sock.groupMetadata(from);



// لیست ادمین‌ها

const admins =
metadata.participants
.filter(p=>p.admin)
.map(p=>p.id);



// صاحب ربات

const owner =
sock.user.id.split(":")[0]
+
"@s.whatsapp.net";



// اگر ادمین یا اونر بود

if(
admins.includes(sender) ||
sender === owner
){

return;

}



// حذف پیام

await sock.sendMessage(from,{
delete:m.key
});




// شمارش هشدار

if(!warns[sender]){

warns[sender] = 0;

}


warns[sender]++;





// کیک در هشدار سوم

if(warns[sender] >= 3){



await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);



await sock.sendMessage(from,{

text:
`🚫 @${sender.split("@")[0]} بعد از 3 اخطار حذف شد`,

mentions:[sender]

});



warns[sender]=0;



}else{



await sock.sendMessage(from,{

text:
`⚠️ اخطار ${warns[sender]}/3

لطفاً قوانین گروه را رعایت کنید.`,

mentions:[sender]

});


}



}catch(e){

console.log(
"ANTIBAD ERROR:",
e
);


}


}