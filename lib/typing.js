const sleep = (ms) =>
new Promise(resolve => setTimeout(resolve, ms));


export default async function typing(
sock,
from,
options = {}
){

try{


const {
min = 2000,
max = 7000,
typingTime = null,
read = true
} = options;



const time =
typingTime ??
Math.floor(
Math.random() * (max - min + 1)
) + min;



// خواندن پیام
if(read){

try{

await sock.readMessages([
{
remoteJid: from,
id: Date.now().toString()
}
]);

}catch{}

}



// شروع تایپ

await sock.sendPresenceUpdate(
"composing",
from
);



await sleep(time);



// توقف تایپ

await sock.sendPresenceUpdate(
"paused",
from
);



// برگشت آنلاین

await sleep(500);


await sock.sendPresenceUpdate(
"available",
from
);



}catch(e){

console.log(
"TYPING ERROR:",
e.message
);

}


}