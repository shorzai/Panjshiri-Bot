export default async function unblock(
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
text:"📌 !unblock 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

await sock.updateBlockStatus(
jid,
"unblock"
);

await sock.sendMessage(from,{
text:"✅ user unblocked"
});

}catch(e){

console.log(e);

}

}