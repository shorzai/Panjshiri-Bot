import PDFDocument from "pdfkit";

export default async function pdf(sock, from, body, m, args) {
    try {
        const text = args.join(" ");
        if (!text) {
            return await sock.sendMessage(from, { text: "⚠️ متنی که می‌خواهید به PDF تبدیل شود را وارد کنید.\nمثال: !pdf این یک متن تست است." }, { quoted: m });
        }

        await sock.sendMessage(from, { text: "📄 در حال ساخت فایل PDF..." }, { quoted: m });

        const doc = new PDFDocument();
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", async () => {
            const pdfBuffer = Buffer.concat(chunks);
            await sock.sendMessage(from, {
                document: pdfBuffer,
                mimetype: "application/pdf",
                fileName: "RAEES-SULTAN-DOC.pdf",
                caption: "✅ فایل PDF شما آماده شد."
            }, { quoted: m });
        });

        doc.fontSize(16).text(text, { align: "center" });
        doc.end();

    } catch (error) {
        console.log("PDF ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در ساخت PDF." }, { quoted: m });
    }
}