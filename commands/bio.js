export default async function bio(
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
text:"📌 !bio hello"
});

}

await sock.updateProfileStatus(text);

await sock.sendMessage(from,{
text:"🧠 bio updated"
});

}catch(e){

console.log(e);

}

}