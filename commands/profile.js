export default async function profile(
sock,
from,
body,
m
){

try{

const pp =
await sock.profilePictureUrl(
from,
"image"
);

await sock.sendMessage(from,{
image:{ url:pp },
caption:"📸 GROUP PROFILE"
});

}catch(e){

console.log(e);

}

}