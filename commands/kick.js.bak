export default async function kick(
sock,
from,
body,
m,
args
){

try{

const number = args[0];

if(!number){

return sock.sendMessage(from,{
text:"📌 !kick 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

await sock.groupParticipantsUpdate(
from,
[jid],
"remove"
);

await sock.sendMessage(from,{
text:"✔️ kicked"
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ failed"
});

}

}