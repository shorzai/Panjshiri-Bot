export default async function autostatus(
sock,
from,
body,
m
){

try{

if(from === "status@broadcast"){

await sock.readMessages([m.key]);

}

}catch(e){

console.log(e);

}

}