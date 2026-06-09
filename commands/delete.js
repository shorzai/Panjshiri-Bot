export default async function del(
sock,
from,
body,
m
){

try{

if(!m.message?.extendedTextMessage?.contextInfo){

return sock.sendMessage(from,{
text:"📌 روی پیام reply کن"
});

}

const key =
m.message.extendedTextMessage.contextInfo
.stanzaId;

const participant =
m.message.extendedTextMessage.contextInfo
.participant;

await sock.sendMessage(from,{
delete:{
remoteJid:from,
fromMe:false,
id:key,
participant
}
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ delete failed"
});

}

}