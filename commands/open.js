export default async function open(
sock,
from
){

try{

await sock.groupSettingUpdate(
from,
"not_announcement"
);

await sock.sendMessage(from,{
text:"🔓 گروه باز شد"
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ open failed"
});

}

}