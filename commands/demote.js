export default async function demote(
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
text:"📌 !demote 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

await sock.groupParticipantsUpdate(
from,
[jid],
"demote"
);

await sock.sendMessage(from,{
text:"⚔️ demoted"
});

}catch(e){

console.log(e);

}

}