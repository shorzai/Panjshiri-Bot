export default async function pin(
sock,
from,
body,
m
){

try{

const msg =
m.message?.extendedTextMessage
?.contextInfo;

if(!msg){

return sock.sendMessage(from,{
text:"📌 reply message"
});

}

await sock.sendMessage(
sock.user.id,
{
forward:{
key:{
remoteJid:from,
id:msg.stanzaId,
participant:msg.participant
},
message:msg.quotedMessage
}
}
);

await sock.sendMessage(from,{
text:"📌 pinned to saved"
});

}catch(e){

console.log(e);

}

}