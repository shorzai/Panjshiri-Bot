const autoReact = {};

export default async function autoreact(
sock,
from,
body,
m,
args
){

// on
if(args[0] === "on"){

autoReact[from] = true;

return sock.sendMessage(from,{
text:"✅ AUTO REACT ON"
});

}

// off
if(args[0] === "off"){

autoReact[from] = false;

return sock.sendMessage(from,{
text:"❌ AUTO REACT OFF"
});

}

if(!autoReact[from]) return;

const emojis = [
"😈",
"🔥",
"⚡",
"💀",
"👑"
];

const pick =
emojis[
Math.floor(Math.random()*emojis.length)
];

await sock.sendMessage(from,{
react:{
text:pick,
key:m.key
}
});

}