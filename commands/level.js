import fs from "fs";

const file = "./data/level.json";

let db = {};

if(fs.existsSync(file)){
db = JSON.parse(fs.readFileSync(file));
}

export default async function level(sock, from, body, m){

const user = m.key.participant || from;

if(!db[user]){
db[user] = { xp:0, level:1 };
}

db[user].xp += 10;

if(db[user].xp >= 100){
db[user].level++;
db[user].xp = 0;
}

fs.writeFileSync(file, JSON.stringify(db,null,2));

await sock.sendMessage(from,{
text:`🧠 Level: ${db[user].level} | XP: ${db[user].xp}`
});

}