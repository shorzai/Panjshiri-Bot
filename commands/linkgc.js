export default async function linkgc(
sock,
from
){

try{

const code =
await sock.groupInviteCode(from);

await sock.sendMessage(from,{
text:
"https://chat.whatsapp.com/" + code
});

}catch(e){

console.log(e);

}

}