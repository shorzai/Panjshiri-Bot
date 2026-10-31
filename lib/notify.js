export async function notifyOwner(sock) {

  const owner = "93794384087@s.whatsapp.net";

  try {

    await sock.sendMessage(owner, {
      text: `✅ BOT CONNECTED SUCCESSFULLY

🤖 Name: SULTAN SHIRZAI PANJSHIRI V1
📱 Number: ${sock.user?.id || "Unknown"}
⏰ Time: ${new Date().toLocaleString()}`
    });

  } catch (error) {

    console.log("NOTIFY ERROR:", error);

  }

}