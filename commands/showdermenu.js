export default async function showder(sock, from, body, m, args) {

const menu = `
╭━━━〔 ⚙️ SHOWDER SYSTEM 〕━━━╮

📌 دستورات Showder:

\`\`\`
!showder add
!showder list
!showder remove
!showder on
!showder off
!showder status
!shadowclear
\`\`\`

╰━━━━━━━━━━━━━━━━━━━━╯

🤖 SULTAN SHIRZAI BOT
`;

await sock.sendMessage(
from,
{
text: menu
},
{
quoted: m
}
);

}