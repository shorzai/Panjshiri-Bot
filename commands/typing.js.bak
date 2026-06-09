export default async function typing(
sock,
from
){

await sock.sendPresenceUpdate(
"composing",
from
);

setTimeout(async()=>{

await sock.sendPresenceUpdate(
"available",
from
);

},5000);

}