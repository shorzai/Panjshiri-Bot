import fetch from "node-fetch";


export default async function weather(
sock,
from,
body,
m,
args
){

try{


const city =
args.join(" ").trim();



if(!city){

return sock.sendMessage(from,{
text:
"📌 استفاده:\n!weather Kabul"
});

}



const response =
await fetch(
`https://wttr.in/${encodeURIComponent(city)}?format=j1`
);



if(!response.ok){

return sock.sendMessage(from,{
text:
"❌ سرویس هواشناسی در دسترس نیست"
});

}



const data =
await response.json();



const current =
data.current_condition?.[0];



if(!current){

return sock.sendMessage(from,{
text:
"❌ اطلاعات هوا پیدا نشد"
});

}



let icon = "🌤️";


const weather =
current.weatherDesc?.[0]?.value?.toLowerCase() || "";


if(weather.includes("rain"))
icon="🌧️";

else if(weather.includes("cloud"))
icon="☁️";

else if(weather.includes("sun") || weather.includes("clear"))
icon="☀️";

else if(weather.includes("snow"))
icon="❄️";



await sock.sendMessage(from,{

text:
`
╭━━━〔 ${icon} WEATHER 〕━━━╮

📍 شهر:
${city}

🌡️ دما:
${current.temp_C}°C

🤔 احساس:
${current.FeelsLikeC}°C

💧 رطوبت:
${current.humidity}%

💨 سرعت باد:
${current.windspeedKmph} km/h

☁️ وضعیت:
${current.weatherDesc[0].value}

👁️ دید:
${current.visibility} km

🤖 SULTAN BUG BOT
🟢 WEATHER SYSTEM ONLINE

╰━━━━━━━━━━━━╯
`

});


}catch(e){

console.log(
"WEATHER ERROR:",
e
);


await sock.sendMessage(from,{
text:
"❌ خطا در دریافت وضعیت هوا"
});

}


}