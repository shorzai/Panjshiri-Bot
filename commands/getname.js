export default async function getname(
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
text:"📌 !getname 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

const data =
await sock.onWhatsApp(jid);

await sock.sendMessage(from,{
text:JSON.stringify(data,null,2)
});

}catch(e){

console.log(e);

}

}