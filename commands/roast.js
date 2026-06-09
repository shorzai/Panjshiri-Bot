export default async function roast(sock, from){

const roasts = [
"😈 مغزت در حال آپدیت است، لطفاً صبر کن...",
"☠️ حتی گوگل هم جواب سوالاتو نداره",
"😂 تو هنوز در مرحله آموزش هستی"
];

const r = roasts[Math.floor(Math.random()*roasts.length)];

await sock.sendMessage(from,{ text:r });

}