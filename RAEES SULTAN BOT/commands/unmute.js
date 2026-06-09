export default async function unmute(
sock,
from
){

try{

await sock.groupSettingUpdate(
from,
"not_announcement"
);

await sock.sendMessage(from,{
text:"🔊 همه می‌توانند پیام بدهند"
});

}catch(e){

console.log(e);

}

}