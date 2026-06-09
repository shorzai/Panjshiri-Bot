export default async function join(
sock,
from,
body,
m,
args
){

try{

const link = args[0];

if(!link){

return sock.sendMessage(from,{
text:"📌 !join link"
});

}

const code =
link.split("https://chat.whatsapp.com/")[1];

if(!code){

return sock.sendMessage(from,{
text:"❌ invalid link"
});

}

await sock.groupAcceptInvite(code);

await sock.sendMessage(from,{
text:"✅ joined group"
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ join failed"
});

}

}