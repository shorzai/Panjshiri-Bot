let autoLike = false;


const emojis = [
"🔥",
"😈",
"❤️",
"⚡",
"👑",
"😍",
"💯",
"👏",
"✨",
"🚀",
"🥳",
"👍"
];



export default async function autolike(
sock,
from,
body,
m,
args
){

try{


// ON

if(args?.[0] === "on"){

autoLike = true;

return sock.sendMessage(from,{
text:
"✅ AUTO LIKE STATUS ON"
});

}



// OFF

if(args?.[0] === "off"){

autoLike = false;

return sock.sendMessage(from,{
text:
"❌ AUTO LIKE STATUS OFF"
});

}



// اگر خاموش بود

if(!autoLike)
return;



// فقط استاتوس

if(from !== "status@broadcast")
return;



const emoji =
emojis[
Math.floor(
Math.random()*emojis.length
)
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

console.log(
"AUTOLIKE ERROR:",
e
);


}


}