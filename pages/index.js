import { useState } from "react";
import Head from "next/head";

export default function Home() {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function requestCode() {
        setLoading(true);
        setError("");
        setCode("");

        try {
            const res = await fetch("/api/pairing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();

            if (data.success) setCode(data.code);
            else setError(data.error);
        } catch (e) {
            setError("خطای شبکه: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Head>
                <title>RAEES SULTAN BOT | ربات سلطان شیرزی</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="سیستم اتصال به ربات واتساپ" />
            </Head>

            <div style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: "20px",
                direction: "rtl"
            }}>
                <main style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "24px",
                    padding: "40px 30px",
                    maxWidth: "400px",
                    width: "100%",
                    textAlign: "center",
                    boxShadow: "0 25px 45px rgba(0,0,0,0.2)"
                }}>
                    
                    {/* لوگو */}
                    <img 
                        src="/logo.png" 
                        alt="Sultan Shirzai Logo" 
                        style={{ 
                            width: "120px", 
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "50%", 
                            marginBottom: "20px", 
                            border: "4px solid #25D366",
                            boxShadow: "0 0 20px rgba(37, 211, 102, 0.4)"
                        }} 
                    />

                    <h2 style={{ color: "#ffffff", marginBottom: "10px", fontSize: "22px", fontWeight: "bold" }}>
                        به ربات سلطان شیرزی خوش آمدید
                    </h2>
                    
                    <p style={{ color: "#a0aab5", marginBottom: "30px", fontSize: "14px" }}>
                        شماره خود را با کد کشور (بدون +) وارد کنید
                    </p>
                    
                    <input
                        type="tel"
                        placeholder="93794384087"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ 
                            width: "100%", 
                            padding: "15px", 
                            fontSize: "16px", 
                            marginBottom: "20px", 
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "12px",
                            color: "#ffffff",
                            textAlign: "center",
                            direction: "ltr",
                            outline: "none",
                            boxSizing: "border-box"
                        }}
                    />
                    
                    <button
                        onClick={requestCode}
                        disabled={loading}
                        style={{
                            width: "100%", 
                            padding: "15px", 
                            background: "linear-gradient(90deg, #25D366, #128C7E)", 
                            color: "white",
                            border: "none", 
                            borderRadius: "12px", 
                            cursor: loading ? "not-allowed" : "pointer", 
                            fontSize: "16px", 
                            fontWeight: "bold",
                            boxShadow: "0 4px 15px rgba(37, 211, 102, 0.3)",
                            transition: "transform 0.2s",
                            boxSizing: "border-box"
                        }}
                    >
                        {loading ? "⏳ در حال دریافت..." : "دریافت کد اتصال"}
                    </button>

                    {code && (
                        <div style={{ background: "rgba(37, 211, 102, 0.15)", border: "1px solid #25D366", padding: "20px", marginTop: "25px", borderRadius: "12px" }}>
                            <p style={{ color: "#25D366", margin: "0 0 10px 0", fontWeight: "bold" }}>کد اتصال شما:</p>
                            <div style={{ fontSize: "32px", letterSpacing: "5px", fontWeight: "900", direction: "ltr", color: "#ffffff" }}>
                                {code}
                            </div>
                            <p style={{ fontSize: "13px", color: "#a0aab5", marginTop: "15px", lineHeight: "1.6" }}>
                                واتساپ ← Linked Devices ← Link with phone number
                            </p>
                        </div>
                    )}

                    {error && (
                        <div style={{ background: "rgba(255, 75, 75, 0.15)", border: "1px solid #ff4b4b", padding: "15px", marginTop: "25px", borderRadius: "12px", color: "#ff4b4b", fontSize: "14px" }}>
                            {error}
                        </div>
                    )}

                    {/* خط جداکننده */}
                    <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "30px 0 20px 0" }} />

                    {/* لینک کانال و پشتیبانی */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <a href="https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H" target="_blank" rel="noreferrer" style={{
                            display: "block", width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e0e0e0", textDecoration: "none", fontSize: "14px", boxSizing: "border-box"
                        }}>
                            📢 ورود به کانال واتساپ
                        </a>
                        <a href="https://wa.me/93794384087" target="_blank" rel="noreferrer" style={{
                            display: "block", width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e0e0e0", textDecoration: "none", fontSize: "14px", boxSizing: "border-box"
                        }}>
                            📞 پشتیبانی (سلطان شیرزی)
                        </a>
                    </div>

                </main>
            </div>
        </>
    );
}
