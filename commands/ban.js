import fs from "fs";

const path = "./data/ban.json";


function load(){

try{

if(!fs.existsSync("./data")){
fs.mkdirSync("./data");
}


if(!fs.existsSync(path)){
fs.writeFileSync(path,"{}");
}


return JSON.parse(
fs.readFileSync(path)
);


}catch(e){

console.log("BAN LOAD ERROR:",e);

return {};

}

}



function save(data){

fs.writeFileSync(
path,
JSON.stringify(data,null,2)
);

}



export default async function ban(
sock,
from,
body,
m,
args
){

try{


const bans = load();


const number =
args[0]?.replace(/\D/g,"");



if(!number){

return sock.sendMessage(from,{
text:
`
🚫 BAN SYSTEM

استفاده:

!ban 93794384087

`
});

}



const jid =
number + "@s.whatsapp.net";



if(bans[jid]){

return sock.sendMessage(from,{
text:
"⚠️ این کاربر قبلاً بن شده است"
});

}



bans[jid]={

jid,

number,

reason:
"Manual Ban",

time:
new Date()
.toLocaleString("fa-IR")

};



save(bans);



await sock.sendMessage(from,{
text:
`
╭━━〔 🚫 USER BANNED 〕━━╮

📱 NUMBER:
+${number}

🆔 JID:
${jid}

⚠️ REASON:
Manual Ban

⏰ TIME:
${bans[jid].time}

🟢 STATUS:
SAVED

╰━━━━━━━━━━━━╯
`
});



}catch(e){

console.log(
"BAN ERROR:",
e
);


await sock.sendMessage(from,{
text:
"❌ Ban Error"
});

}


}