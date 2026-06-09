const store = {};

export default async function antidelete(
sock,
from,
body,
m
){

try{

// save messages
if(m.message){

store[m.key.id] = m;

}

// detect delete
if(m.message?.protocolMessage?.type === 0){

const id =
m.message.protocolMessage.key.id;

const msg = store[id];

if(!msg) return;

await sock.sendMessage(from,{
text:"👀 deleted message detected"
});

await sock.relayMessage(
from,
msg.message,
{}
);

}

}catch(e){

console.log(e);

}

}