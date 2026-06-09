import fs from "fs";

const path = "./data/ban.json";

let banned = [];

if(fs.existsSync(path)){
banned = JSON.parse(fs.readFileSync(path));
}

export default async function ban(
sock,
from,
body,
m,
args
){

try{

const number = args[0];

if(!number){

return sock.sendMessage(from,{
text:"📌 !ban 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

if(!banned.includes(jid)){

banned.push(jid);

fs.writeFileSync(
path,
JSON.stringify(banned,null,2)
);

}

await sock.sendMessage(from,{
text:"🚫 user banned"
});

}catch(e){

console.log(e);

}

}