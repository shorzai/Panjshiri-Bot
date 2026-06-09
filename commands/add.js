export default async function add(
sock,
from,
body,
m,
args
){

try{

// فقط گروه
if(!from.endsWith("@g.us")){
return sock.sendMessage(from,{
text:"❌ فقط در گروه"
});
}

// شماره
const number = args[0];

if(!number){
return sock.sendMessage(from,{
text:"📌 !add 9379xxxxxxx"
});
}

// ساخت jid
const jid =
number.replace(/[^0-9]/g,"") +
"@s.whatsapp.net";

// add واقعی
const res = await sock.groupParticipantsUpdate(
from,
[jid],
"add"
);

console.log(res);

await sock.sendMessage(from,{
text:"✅ User added"
});

}catch(e){

console.log("ADD ERROR:", e);

await sock.sendMessage(from,{
text:"❌ add failed"
});

}

}