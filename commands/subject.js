export default async function subject(
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
text:"📌 !subject new name"
});

}

await sock.groupUpdateSubject(
from,
text
);

await sock.sendMessage(from,{
text:"👑 اسم گروه تغییر کرد"
});

}catch(e){

console.log(e);

}

}