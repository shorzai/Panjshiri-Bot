export default async function mute(
sock,
from
){

try{

await sock.groupSettingUpdate(
from,
"announcement"
);

await sock.sendMessage(from,{
text:"🔇 فقط ادمین‌ها می‌توانند پیام بدهند"
});

}catch(e){

console.log(e);

}

}