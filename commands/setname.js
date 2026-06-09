export default async function setname(
sock,
from,
body,
m,
args
){

try{

const text = args.join(" ");

if(!text){

return sock.sendMessage(from,{
text:"📌 !setname RAEES"
});

}

await sock.updateProfileName(text);

await sock.sendMessage(from,{
text:"👑 name updated"
});

}catch(e){

console.log(e);

}

}