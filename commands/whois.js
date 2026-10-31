export default async function whois(sock, from, body, m, args) {

try {


const input = args[0];


if(!input){

return sock.sendMessage(from,{
text:
`📌 استفاده:

!whois 9379xxxxxxx`
});

}



const number =
input.replace(/\D/g,"");



if(number.length < 8){

return sock.sendMessage(from,{
text:"❌ شماره صحیح نیست"
});

}



const jid =
number + "@s.whatsapp.net";



// بررسی واتساپ

const check =
await sock.onWhatsApp(jid);



if(!check?.[0]?.exists){

return sock.sendMessage(from,{
text:
`❌ این شماره واتساپ ندارد

📱 ${number}`
});

}




let photo =
null;


try{

photo =
await sock.profilePictureUrl(
jid,
"image"
);

}catch{}




let status =
"ندارد";


try{

const data =
await sock.fetchStatus(jid);

if(data?.status){

status =
data.status;

}

}catch{}




const country =
number.startsWith("93")
? "🇦🇫 افغانستان"
:
number.startsWith("98")
? "🇮🇷 ایران"
:
number.startsWith("1")
? "🇺🇸 آمریکا"
:
"🌍 ناشناخته";




const result =
`
╭━━━〔 🕵️ WHOIS 〕━━━╮

📱 شماره:
${number}

🌍 کشور احتمالی:
${country}

✅ واتساپ:
فعال است

🆔 JID:
${jid}

📝 Status:
${status}

⏰ زمان بررسی:
${new Date().toLocaleString()}

🤖 SULTAN BUG BOT
╰━━━━━━━━━━━━╯
`;




if(photo){

await sock.sendMessage(from,{

image:{
url:photo
},

caption:result

});

}else{


await sock.sendMessage(from,{
text:result
});


}




}catch(e){

console.log(
"WHOIS ERROR:",
e
);


await sock.sendMessage(from,{
text:
"❌ خطا در اجرای WHOIS"
});


}

}