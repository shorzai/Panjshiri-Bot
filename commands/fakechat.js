export default async function fakechat(
sock,
from,
body,
m,
args
){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !fakechat hello"
});
}

await sock.sendMessage(from,{
text:text,
contextInfo:{
quotedMessage:{
conversation:"🤖 SYSTEM"
},
participant:"0@s.whatsapp.net"
}
});

}