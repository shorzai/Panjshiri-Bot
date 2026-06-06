export default async function block(
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
text:"📌 !block 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

await sock.updateBlockStatus(
jid,
"block"
);

await sock.sendMessage(from,{
text:"🚫 user blocked"
});

}catch(e){

console.log(e);

}

}