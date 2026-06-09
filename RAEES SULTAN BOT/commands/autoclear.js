const autoClear = {};

export default async function autoclear(
sock,
from,
body,
m,
args
){

try{

// ON
if(args[0] === "on"){

if(autoClear[from]){

return sock.sendMessage(from,{
text:"⚠️ already on"
});

}

autoClear[from] = setInterval(async()=>{

try{

await sock.chatModify(
{
clear:true
},
from
);

}catch{}

},300000);

return sock.sendMessage(from,{
text:"✅ AUTO CLEAR ON"
});

}

// OFF
if(args[0] === "off"){

if(autoClear[from]){

clearInterval(autoClear[from]);

delete autoClear[from];

}

return sock.sendMessage(from,{
text:"❌ AUTO CLEAR OFF"
});

}

// HELP
await sock.sendMessage(from,{
text:"📌 !autoclear on/off"
});

}catch(e){

console.log(e);

}

}