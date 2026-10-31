import fs from "fs";

const path = "./data/shadow.json";


function load(){

try{

if(!fs.existsSync("./data")){
fs.mkdirSync("./data");
}


if(!fs.existsSync(path)){

fs.writeFileSync(
path,
JSON.stringify({
enabled:true,
users:{}
},null,2)
);

}


return JSON.parse(
fs.readFileSync(path)
);


}catch(e){

return {
enabled:true,
users:{}
};

}

}



function save(data){

fs.writeFileSync(
path,
JSON.stringify(data,null,2)
);

}



export default async function shadowCommand(
sock,
from,
body,
m,
args
){

try{


const mode =
args[0]?.toLowerCase();



const db = load();



if(!mode){

return sock.sendMessage(from,{
text:
`
🌑 SHADOW CONTROL

استفاده:

!shadow on
!shadow off
!shadow status
`
});

}



if(mode==="on"){

db.enabled=true;

save(db);


return sock.sendMessage(from,{
text:
"🌑 Shadow System فعال شد ✅"
});

}



if(mode==="off"){

db.enabled=false;

save(db);


return sock.sendMessage(from,{
text:
"🌑 Shadow System خاموش شد 📴"
});

}



if(mode==="status"){


return sock.sendMessage(from,{
text:
`
🌑 SHADOW STATUS

Status:
${db.enabled ? "🟢 ON" : "🔴 OFF"}

Users Saved:
${Object.keys(db.users).length}
`
});

}



}catch(e){

console.log(
"SHADOW COMMAND ERROR:",
e
);

}

}