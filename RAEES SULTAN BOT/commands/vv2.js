export default async function vv2(
sock,
from,
body,
m
){

try{

const msg =
m.message?.extendedTextMessage
?.contextInfo?.quotedMessage;

if(!msg){

return sock.sendMessage(from,{
text:"📌 reply view once"
});

}

const v =
msg.viewOnceMessageV2 ||
msg.viewOnceMessage;

if(!v){

return sock.sendMessage(from,{
text:"❌ not view once"
});

}

await sock.relayMessage(
from,
v.message,
{}
);

}catch(e){

console.log(e);

}

}