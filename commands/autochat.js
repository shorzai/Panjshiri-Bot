export default async function autochat(
sock,
from,
body
){

try{

const text = body.toLowerCase();

if(text === "سلام"){

await sock.sendMessage(from,{
text:"👋 سلام شینگول 😈"
});

}

if(text === "ربات"){

await sock.sendMessage(from,{
text:"🤖 بلی آنلاین هستم"
});

}

}catch(e){

console.log(e);

}

}