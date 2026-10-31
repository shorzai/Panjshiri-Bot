import { getDB, saveDB } from "../lib/db.js";

export default async function mafia(
sock,
from,
body,
m,
args
){

try{

if(!from.endsWith("@g.us")) return;


let db = getDB();

db.mafia ??= {};


const command = args[0]?.toLowerCase();

const user = m.key.participant || from;


// ساخت بازی

if(command === "create"){

if(db.mafia[from]){

return sock.sendMessage(from,{
text:"⚠️ یک بازی مافیا در حال اجرا است"
});

}


db.mafia[from] = {

owner:user,

status:"waiting",

players:[]

};


saveDB(db);


return sock.sendMessage(from,{
text:
`🐺 مافیا ساخته شد

برای ورود:
!join

دیدن بازیکنان:
!players`
});

}


// ورود

if(body.toLowerCase() === "!join"){

const game = db.mafia[from];


if(!game){

return sock.sendMessage(from,{
text:"❌ اول بازی ساخته شود"
});

}


if(game.status !== "waiting"){

return sock.sendMessage(from,{
text:"❌ بازی شروع شده است"
});

}


if(game.players.includes(user)){

return sock.sendMessage(from,{
text:"⚠️ قبلاً وارد بازی شدی"
});

}


game.players.push(user);

saveDB(db);


return sock.sendMessage(from,{
text:
`✅ بازیکن اضافه شد

👥 تعداد:
${game.players.length}`
});

}



// خروج

if(body.toLowerCase() === "!leave"){

const game=db.mafia[from];


if(!game) return;


game.players =
game.players.filter(
p=>p!==user
);


saveDB(db);


return sock.sendMessage(from,{
text:"🚪 از بازی خارج شدی"
});

}



// لیست

if(command === "players"){

const game=db.mafia[from];


if(!game){

return sock.sendMessage(from,{
text:"❌ بازی وجود ندارد"
});

}


let list = game.players
.map((p,i)=>
`${i+1}. @${p.split("@")[0]}`
)
.join("\n");


return sock.sendMessage(from,{
text:
`🐺 بازیکنان مافیا:

${list || "خالی"}`,
mentions:game.players
});

}



}catch(e){

console.log("MAFIA ERROR:",e);

}


}