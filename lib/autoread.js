export default async function autoread(
sock,
from,
body,
m
){

try{


if(!m?.key)
return;



await sock.readMessages([
m.key
]);



}catch(e){


console.log(
"AUTOREAD ERROR:",
e
);


}

}