import fs from "fs";

const file = "./database/db.json";

export function getDB(){
  return JSON.parse(fs.readFileSync(file));
}

export function saveDB(data){
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}