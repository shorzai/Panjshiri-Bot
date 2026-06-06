const antiImage = {};

export default async function antiimage(
sock,
from,
body,
m,
args
){

try{

// on
if(args[0] === "on"){

antiImage[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI IMAGE ON"
});

}

// off
if(args[0] === "off"){

antiImage[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI IMAGE OFF"
});

}

if(!antiImage[from]) return;

if(m.message?.imageMessage){

await sock.sendMessage(from,{
delete:m.key
});

}

}catch(e){

console.log(e);

}

}