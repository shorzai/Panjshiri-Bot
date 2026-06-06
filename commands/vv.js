export default async function vv(
sock,
from,
body,
m
){

try{

const msg =
m.message?.extendedTextMessage?.contextInfo
?.quotedMessage;

if(!msg){

return sock.sendMessage(from,{
text:"📌 روی ویو وانس reply کن"
});

}

const v =
msg.viewOnceMessageV2 ||
msg.viewOnceMessage;

if(!v){

return sock.sendMessage(from,{
text:"❌ view once نیست"
});

}

const media =
v.message.imageMessage ||
v.message.videoMessage;

await sock.sendMessage(from,{
forward:{
key:m.message.extendedTextMessage.contextInfo
.participant,
message:v.message
}
});

}catch(e){

console.log(e);

}

}