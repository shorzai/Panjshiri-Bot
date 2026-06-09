export default async function autosticker(
sock,
from,
body,
m
){

try{

const img =
m.message?.imageMessage;

if(!img) return;

const buffer =
await sock.downloadMediaMessage(m);

await sock.sendMessage(from,{
sticker:buffer
});

}catch(e){

console.log(e);

}

}