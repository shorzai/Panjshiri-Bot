export default async function fun(
sock,
from,
args,
m
){

const jokes = [

"😂 امروز اینترنت از ترس ربات قطع شد",

"☠️ واتساپ گفت آرام‌تر بزن",

"🔥 ربات گفت: من هنوز گرم نشدم",

"👑 رئیس آنلاین شد همه فرار کردند"

];

const random =
jokes[Math.floor(Math.random()*jokes.length)];

await sock.sendMessage(from,{
text: random
});

}