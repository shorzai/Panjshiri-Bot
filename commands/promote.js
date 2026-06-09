export default async function promote(
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
text:"📌 !promote 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

await sock.groupParticipantsUpdate(
from,
[jid],
"promote"
);

await sock.sendMessage(from,{
text:"👑 promoted"
});

}catch(e){

console.log(e);

}

}