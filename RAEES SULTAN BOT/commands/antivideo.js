const antiVideo = {};

export default async function antivideo(
sock,
from,
body,
m,
args
){

try{

if(args[0] === "on"){

antiVideo[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI VIDEO ON"
});

}

if(args[0] === "off"){

antiVideo[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI VIDEO OFF"
});

}

if(!antiVideo[from]) return;

if(m.message?.videoMessage){

await sock.sendMessage(from,{
delete:m.key
});

}

}catch(e){

console.log(e);

}

}