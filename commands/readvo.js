export default async function readvo(
sock,
from,
body,
m
){

try{

const msg =
m.message?.extendedTextMessage
?.contextInfo?.quotedMessage;

if(!msg) return;

const v =
msg.viewOnceMessageV2 ||
msg.viewOnceMessage;

if(!v) return;

await sock.sendMessage(
sock.user.id,
v.message
);

await sock.sendMessage(from,{
text:"👁️ saved to private"
});

}catch(e){

console.log(e);

}
}