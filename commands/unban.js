import fs from "fs";

const path = "./data/ban.json";

export default async function unban(
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
text:"📌 !unban 9379xxxx"
});

}

const jid =
number.replace(/\D/g,"") +
"@s.whatsapp.net";

let data = [];

if(fs.existsSync(path)){

data = JSON.parse(
fs.readFileSync(path)
);

}

data = data.filter(v=>v !== jid);

fs.writeFileSync(
path,
JSON.stringify(data,null,2)
);

await sock.sendMessage(from,{
text:"✅ user unbanned"
});

}catch(e){

console.log(e);

}

}