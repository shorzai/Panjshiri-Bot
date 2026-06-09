export default async function autovv(
sock,
from,
body,
m
){

try{

const msg = m.message;

if(
msg?.viewOnceMessageV2 ||
msg?.viewOnceMessage
){

const v =
msg.viewOnceMessageV2 ||
msg.viewOnceMessage;

await sock.relayMessage(
from,
v.message,
{}
);

}

}catch(e){

console.log(e);

}

}