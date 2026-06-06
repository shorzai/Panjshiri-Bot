import fs from "fs";

const file = "./data/level.json";

export default async function rank(sock, from){

const db = JSON.parse(fs.readFileSync(file));

const sorted = Object.entries(db)
.sort((a,b)=>b[1].level - a[1].level)
.slice(0,5);

let text = "🏆 TOP USERS\n\n";

for(const [user,data] of sorted){

text += `👤 ${user.split("@")[0]} → Level ${data.level}\n`;

}

await sock.sendMessage(from,{ text });

}