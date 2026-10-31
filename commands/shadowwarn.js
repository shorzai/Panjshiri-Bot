import fs from "fs";

const path = "./data/shadow.json";


export default async function shadowwarn(
sock,
from,
body,
m
){

try{


if(!fs.existsSync(path)){

return sock.sendMessage(from,{
text:"❌ Shadow database not found"
});

}



const db =
JSON.parse(
fs.readFileSync(path)
);



const target =
m.message?.extendedTextMessage
?.contextInfo
?.mentionedJid?.[0];



if(!target){

return sock.sendMessage(from,{
text:
"📌 کاربر را منشن کن"
});

}



if(!db.users[target]){

return sock.sendMessage(from,{
text:
"❌ این کاربر هنوز در Shadow ثبت نشده"
});

}



db.users[target].warnings =
(db.users[target].warnings || 0)+1;



fs.writeFileSync(
path,
JSON.stringify(db,null,2)
);



await sock.sendMessage(from,{
text:
`
⚠️ SHADOW WARNING

USER:
@${target.split("@")[0]}

WARN:
${db.users[target].warnings}/3

STATUS:
${
db.users[target].warnings >=3
?
"🚫 خطر بالا"
:
"🟡 تحت نظر"
}
`,
mentions:[target]
});



}catch(e){

console.log(
"SHADOW WARN ERROR:",
e
);

}

}