export default async function shorten(sock, from, body, m, args){

const url = args[0];

if(!url){
return sock.sendMessage(from,{
text:"📌 !short https://example.com"
});
}

await sock.sendMessage(from,{
text:`🔗 Short Link (demo): ${url.slice(0,20)}...`
});

}