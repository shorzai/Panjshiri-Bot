export default async function sticker(sock, from, m){

await sock.sendMessage(from,{
text:"📌 برای استیکر باید عکس یا ویدیو reply کنی (demo mode)"
});

}