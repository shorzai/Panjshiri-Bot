const antiAudio = {};

export default async function antiaudio(
sock,
from,
body,
m,
args
){

try{

if(args[0] === "on"){

antiAudio[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI AUDIO ON"
});

}

if(args[0] === "off"){

antiAudio[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI AUDIO OFF"
});

}

if(!antiAudio[from]) return;

if(m.message?.audioMessage){

await sock.sendMessage(from,{
delete:m.key
});

}

}catch(e){

console.log(e);

}

}