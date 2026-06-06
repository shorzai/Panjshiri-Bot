export default async function love(sock, from, body, m, args){

const percent = Math.floor(Math.random()*100);

await sock.sendMessage(from,{
text:`❤️ Love Percentage: ${percent}%`
});

}