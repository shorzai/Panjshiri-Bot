export default async function autolike(
sock,
from,
body,
m
){

try{

if(from !== "status@broadcast")
return;

const emojis = [
"🔥",
"😈",
"❤️",
"⚡",
"👑"
];

const emoji =
emojis[
Math.floor(Math.random()*emojis.length)
];

await sock.sendMessage(
from,
{
react:{
key:m.key,
text:emoji
}
}
);

}catch(e){

console.log(e);

}

}