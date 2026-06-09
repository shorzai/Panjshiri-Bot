export default async function check(
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
text:"📌 !check 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

const data =
await sock.onWhatsApp(jid);

if(data.length > 0){

await sock.sendMessage(from,{
text:"✅ number exists"
});

}else{

await sock.sendMessage(from,{
text:"❌ number not found"
});

}

}catch(e){

console.log(e);

}

}