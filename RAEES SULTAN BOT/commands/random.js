export default async function random(sock, from, body, m, args){

const max = parseInt(args[0]) || 100;

const num = Math.floor(Math.random()*max)+1;

await sock.sendMessage(from,{
text:`🎲 Random: ${num}`
});

}