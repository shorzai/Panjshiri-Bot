import fs from "fs";

const file = "./data/economy.json";

export default async function gamble(sock, from, body, m, args){

const user = m.key.participant || from;

let db = JSON.parse(fs.readFileSync(file));

const bet = parseInt(args[0]);

if(!bet || db[user] < bet){
return sock.sendMessage(from,{
text:"❌ invalid bet"
});
}

const win = Math.random() > 0.5;

if(win){
db[user] += bet;
}else{
db[user] -= bet;
}

fs.writeFileSync(file, JSON.stringify(db,null,2));

await sock.sendMessage(from,{
text: win ? "🎉 YOU WIN" : "💀 YOU LOSE"
});

}