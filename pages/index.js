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
            {/* 👈 عنوان تب مرورگر */}
            <Head>
                <title>ربات سلطان شیرزی شتلی</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <main style={{ maxWidth: 400, margin: "50px auto", padding: 20, fontFamily: "sans-serif", textAlign: "center" }}>
                
                {/* 👈 عکس لوگو (مطمئن شو عکس با اسم logo.png داخل پوشه public هست) */}
                <img 
                    src="/logo.png" 
                    alt="Sultan Shirzai Logo" 
                    style={{ 
                        width: "130px", 
                        height: "130px",
                        objectFit: "cover",
                        borderRadius: "50%", 
                        marginBottom: "20px", 
                        boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
                        border: "3px solid #25D366"
                    }} 
                />

                {/* 👈 عنوان خوش‌آمدگویی */}
                <h2 style={{ color: "#128C7E", marginBottom: "20px", fontSize: "22px" }}>
                    به ربات سلطان شیرزی شتلی خوش آمدید
                </h2>
                
                <p style={{ color: "#555", marginBottom: "15px" }}>شماره خود را با کد کشور (بدون +) وارد کنید:</p>
                
                <input
                    type="tel"
                    placeholder="989121234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ 
                        width: "100%", 
                        padding: "12px", 
                        fontSize: "16px", 
                        marginBottom: "10px", 
                        border: "1px solid #ccc", 
                        borderRadius: "8px",
                        textAlign: "center",
                        direction: "ltr"
                    }}
                />
                
                <button
                    onClick={requestCode}
                    disabled={loading}
                    style={{
                        width: "100%", 
                        padding: "12px", 
                        background: "#25D366", 
                        color: "white",
                        border: "none", 
                        borderRadius: "8px", 
                        cursor: "pointer", 
                        fontSize: "16px", 
                        fontWeight: "bold",
                        transition: "0.3s"
                    }}
                >
                    {loading ? "در حال دریافت..." : "دریافت کد اتصال"}
                </button>

                {code && (
                    <div style={{ background: "#d4edda", padding: "15px", marginTop: "20px", borderRadius: "8px" }}>
                        <p style={{ margin: "0 0 10px 0" }}>کد اتصال شما:</p>
                        <div style={{ fontSize: "32px", letterSpacing: "4px", fontWeight: "bold", direction: "ltr", color: "#155724" }}>
                            {code}
                        </div>
                        <p style={{ fontSize: "14px", color: "#155724", marginTop: "10px" }}>واتساپ ← Linked Devices ← Link with phone number</p>
                    </div>
                )}

                {error && (
                    <div style={{ background: "#f8d7da", padding: "15px", marginTop: "20px", borderRadius: "8px", color: "#721c24" }}>
                        {error}
                    </div>
                )}
            </main>
        </>
    );
}