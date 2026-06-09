const msgs = {};

export default async function antidelete2(
sock,
from,
body,
m
){

try{

// save messages
if(m.message){

msgs[m.key.id] = {
sender:m.key.participant || from,
message:m.message
};

}

// detect delete
if(m.message?.protocolMessage?.type === 0){

const id =
m.message.protocolMessage.key.id;

const data = msgs[id];

if(!data) return;

await sock.sendMessage(from,{
text:`
👀 MESSAGE DELETED

USER:
@${data.sender.split("@")[0]}
`,
mentions:[data.sender]
});

await sock.relayMessage(
from,
data.message,
{}
);

}

}catch(e){

console.log(e);

}

}