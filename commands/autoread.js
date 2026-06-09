export default async function autoread(
sock,
from,
body,
m
){

try{

await sock.readMessages([m.key]);

}catch(e){

console.log(e);

}

}