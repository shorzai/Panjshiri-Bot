import fs from "fs";

const path = "./data/shadow.json";


export default async function topshadow(
sock,
from
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



const users =
Object.entries(
db.users || {}
);



if(!users.length){

return sock.sendMessage(from,{
text:"📊 No shadow data yet"
});

}



const top =
users
.sort(
(a,b)=>b[1].xp-a[1].xp
)
.slice(0,10);



let text =
`
╭━━〔 🏆 SHADOW TOP 〕━━╮

`;



let mentions=[];



top.forEach(
(item,index)=>{

const jid=item[0];
const data=item[1];


mentions.push(jid);


text +=
`
${index+1} 👑 @${jid.split("@")[0]}

⭐ XP:
${data.xp}

🏆 LEVEL:
${data.level}

🎖 RANK:
${data.rank}

`;

});



text +=
`
╰━━━━━━━━━━━━╯
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
"TOP SHADOW ERROR:",
e
);

}

}