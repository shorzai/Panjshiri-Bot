export default async function getpp(
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
text:"📌 !getpp 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

const pp =
await sock.profilePictureUrl(
jid,
"image"
);

await sock.sendMessage(from,{
image:{ url:pp },
caption:"📸 PROFILE"
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ profile not found"
});

}

}