import fs from "fs";

export default async function menu(
sock,
from,
body,
m,
args
){

const imagePath = "./sultan/menu.jpg";

const caption = `
╭━━〔 👑 RAEES SULTAN BOT 👑 〕━━╮

┃ ⚡ STATUS : ONLINE
┃ 👑 OWNER : RAEES SULTAN
┃ 🤖 VERSION : ULTRA VPS

╭━━〔 🤖 AI MENU 〕━━╮
┃ • !ai
┃ • !ai-lite
┃ • !gpt
┃ • !detect
┃ • !translate
┃ • !search

╭━━〔 ⚔️ WAR / POWER MENU 〕━━╮
┃ • !war
┃ • !marshal
┃ • !power
┃ • !kingpower
┃ • !box
┃ • !add
┃ • !addall
┃ • !kick
┃ • !promote
┃ • !demote
┃ • !ban
┃ • !unban

╭━━〔 👥 GROUP SECURITY 〕━━╮
┃ • !antilink on/off
┃ • !antibad on/off
┃ • !antispam on/off
┃ • !autoclear on/off
┃ • !antiforeign on/off
┃ • !antidelete

╭━━〔 🎵 MUSIC MENU 〕━━╮
┃ • !music
┃ • !song
┃ • !lyrics

╭━━〔 😂 FUN MENU 〕━━╮
┃ • !joke
┃ • !fact
┃ • !love
┃ • !roast
┃ • !dice
┃ • !quote
┃ • !fakereply

╭━━〔 ⚡ TOOLS MENU 〕━━╮
┃ • !calc
┃ • !reverse
┃ • !emoji
┃ • !random
┃ • !count
┃ • !echo
┃ • !say
┃ • !check
┃ • !whois
┃ • !device

╭━━〔 💰 ECONOMY MENU 〕━━╮
┃ • !balance
┃ • !daily
┃ • !gamble
┃ • !rank
┃ • !level

╭━━〔 🛠️ SYSTEM MENU 〕━━╮
┃ • !ping
┃ • !alive
┃ • !runtime
┃ • !uptime
┃ • !time
┃ • !owner
┃ • !info
┃ • !restart

╭━━〔 👑 ADMIN POWER 〕━━╮
┃ • !broadcast
┃ • !forward
┃ • !invite
┃ • !join
┃ • !block
┃ • !unblock

╰━━━━━━━━━━━━━━━━━━━━━━╯

🔥 POWERED BY RAEES SULTAN
`;

try {

if (!fs.existsSync(imagePath)) {
  return await sock.sendMessage(from,{
    text:"❌ menu.jpg not found"
  });
}

await sock.sendMessage(from,{
  image: fs.readFileSync(imagePath),
  caption
});

} catch(e){

console.log("MENU ERROR:", e);

await sock.sendMessage(from,{
  text: caption
});

}

}