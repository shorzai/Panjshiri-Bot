import fs from "fs";

const file = "./data/showder.json";


function loadData(){

if(!fs.existsSync(file)){
fs.writeFileSync(file,"{}");
}

return JSON.parse(
fs.readFileSync(file)
);

}


function saveData(data){

fs.writeFileSync(
file,
JSON.stringify(data,null,2)
);

}


export default async function showder(
sock,
from,
body,
m,
args
){

const data = loadData();

const sub = args[0];


if(sub === "list"){

let text = "🧠 SHOWDER MEMORY\n\n";

for(const key in data){

text += `• ${key} ➜ ${data[key]}\n`;

}

return sock.sendMessage(
from,
{text},
{quoted:m}
);

}



if(sub === "on"){

data._status = true;
saveData(data);

return sock.sendMessage(
from,
{text:"✅ Showder Learning فعال شد"},
{quoted:m}
);

}



if(sub === "off"){

data._status = false;
saveData(data);

return sock.sendMessage(
from,
{text:"❌ Showder Learning خاموش شد"},
{quoted:m}
);

}



return sock.sendMessage(
from,
{
text:
`🧠 SHOWDER SYSTEM

!showder list
!showder on
!showder off`
},
{quoted:m}
);


}