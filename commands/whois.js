export default async function whois(
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
text:"📌 !whois 9379xxxx"
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

const data =
await sock.onWhatsApp(jid);

await sock.sendMessage(from,{
image:{ url:pp },
caption:`
🕵️ USER INFO

📱 ${jid}

${JSON.stringify(data,null,2)}
`
});

}catch(e){

console.log(e);

}

}