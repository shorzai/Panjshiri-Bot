import fs from "fs";

const path = "./data/shadow.json";


export default async function weeklyshadow(
sock,
from
){

try{


if(!fs.existsSync(path)){

return sock.sendMessage(from,{
text:"❌ Shadow data not found"
});

}



const db =
JSON.parse(
fs.readFileSync(path)
);



const users =
Object.entries(
db.users || {}
);



if(!users.length){

return sock.sendMessage(from,{
text:"📊 No weekly data"
});

}



const top =
users
.sort(
(a,b)=>
(b[1].weeklyXP || 0)
-
(a[1].weeklyXP || 0)
)
.slice(0,10);



let text =
`
╭━━〔 🏆 WEEKLY SHADOW 〕━━╮

`;

let mentions=[];



top.forEach(
(item,index)=>{

const jid=item[0];
const data=item[1];


mentions.push(jid);


text +=
`
${index+1}. 👑 @${jid.split("@")[0]}

⭐ Weekly XP:
${data.weeklyXP || 0}

🏆 Level:
${data.level}

🎖 Rank:
${data.rank}

`;

});


text +=
`
╰━━━━━━━━━━━━╯
🔥 ACTIVE USERS
`;



await sock.sendMessage(
from,
{
text,
mentions
}
);



}catch(e){

console.log(
"WEEKLY SHADOW ERROR:",
e
);

}

}