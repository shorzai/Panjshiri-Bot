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

            if (data.success && data.code) {
                setCode(data.code);
                setLoading(false);
                return;
            }

            const interval = setInterval(async () => {
                const statusRes = await fetch(`/api/pairing/status?phoneNumber=${phone}`);
                const statusData = await statusRes.json();

                if (statusData.success && statusData.code) {
                    clearInterval(interval);
                    setCode(statusData.code);
                    setLoading(false);
                } else if (statusData.success === false) {
                    clearInterval(interval);
                    setError(statusData.error);
                    setLoading(false);
                }
            }, 2000);

            setTimeout(() => {
                clearInterval(interval);
                if (loading) {
                    setError("زمان زیادی طول کشید. لطفا دوباره تلاش کنید.");
                    setLoading(false);
                }
            }, 30000);

        } catch (e) {
            setError("خطای شبکه: " + e.message);
            setLoading(false);
        }
    }

    return (
        <>
            <Head>
                <title>RAEES SULTAN BOT | SYSTEM</title>
                <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="cyber-container">
                <div className="grid-bg"></div>
                <div className="scanlines"></div>
                
                <main className="cyber-card">
                    <div className="glitch-wrapper">
                        <img src="/logo.png" alt="Logo" className="cyber-logo" />
                    </div>
                    
                    <h1 className="cyber-title">SYSTEM ONLINE</h1>
                    <p className="cyber-subtitle">RAEES SULTAN BOT // ACCESS TERMINAL</p>
                    
                    <div className="input-group">
                        <span className="prompt">&gt;</span>
                        <input 
                            type="tel" 
                            placeholder="ENTER TARGET NUMBER..." 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            className="cyber-input"
                        />
                    </div>
                    
                    <button 
                        onClick={requestCode} 
                        disabled={loading} 
                        className={`cyber-btn ${loading ? 'loading' : ''}`}
                    >
                        {loading ? "INITIALIZING..." : "[ ESTABLISH CONNECTION ]"}
                    </button>

                    {code && (
                        <div className="cyber-alert success">
                            <p className="alert-title">✅ ACCESS GRANTED</p>
                            <div className="code-box">
                                <span className="code-text">{code}</span>
                            </div>
                            <p className="alert-desc">LINK DEVICE VIA WHATSAPP</p>
                        </div>
                    )}

                    {error && (
                        <div className="cyber-alert error">
                            <p className="alert-title">❌ CONNECTION FAILED</p>
                            <p className="alert-desc">{error}</p>
                        </div>
                    )}

                    <div className="cyber-footer">
                        <a href="https://whatsapp.com/channel/0029VbDOqY8DOQIcTC1Epm2H" target="_blank" rel="noreferrer" className="footer-link">
                            [ 📢 JOIN CHANNEL ]
                        </a>
                        <a href="https://wa.me/93794384087" target="_blank" rel="noreferrer" className="footer-link">
                            [ 📞 SUPPORT ]
                        </a>
                    </div>
                </main>

                <style jsx>{`
                    .cyber-container { min-height: 100vh; display: flex; justify-content: center; align-items: center; background-color: #050505; font-family: 'Fira Code', monospace; position: relative; overflow: hidden; direction: ltr; }
                    .grid-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(37, 211, 102, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 211, 102, 0.05) 1px, transparent 1px); background-size: 30px 30px; z-index: 0; }
                    .scanlines { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.2)); background-size: 100% 4px; z-index: 1; pointer-events: none; }
                    .cyber-card { position: relative; z-index: 2; background: rgba(10, 15, 10, 0.85); border: 1px solid #25D366; border-radius: 4px; padding: 40px 30px; width: 100%; max-width: 420px; box-shadow: 0 0 20px rgba(37, 211, 102, 0.15), inset 0 0 20px rgba(37, 211, 102, 0.05); text-align: center; }
                    .glitch-wrapper { margin-bottom: 20px; }
                    .cyber-logo { width: 120px; height: 120px; border-radius: 50%; border: 2px solid #25D366; box-shadow: 0 0 20px rgba(37, 211, 102, 0.5); animation: pulse 2s infinite alternate; }
                    @keyframes pulse { 0% { box-shadow: 0 0 10px rgba(37, 211, 102, 0.3); } 100% { box-shadow: 0 0 30px rgba(37, 211, 102, 0.8); } }
                    .cyber-title { color: #25D366; font-size: 24px; margin: 0 0 5px 0; letter-spacing: 2px; }
                    .cyber-subtitle { color: #00ffcc; font-size: 11px; margin-bottom: 30px; opacity: 0.8; }
                    .input-group { display: flex; align-items: center; border-bottom: 2px solid #25D366; margin-bottom: 25px; padding-bottom: 5px; }
                    .prompt { color: #25D366; font-size: 20px; margin-right: 10px; font-weight: bold; }
                    .cyber-input { background: transparent; border: none; color: #fff; font-family: 'Fira Code', monospace; font-size: 16px; width: 100%; outline: none; text-align: left; letter-spacing: 1px; }
                    .cyber-input::placeholder { color: rgba(255,255,255,0.3); }
                    .cyber-btn { width: 100%; padding: 15px; background: transparent; color: #25D366; border: 1px solid #25D366; font-family: 'Fira Code', monospace; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.3s; letter-spacing: 1px; margin-bottom: 20px; }
                    .cyber-btn:hover:not(.loading) { background: rgba(37, 211, 102, 0.2); box-shadow: 0 0 15px rgba(37, 211, 102, 0.4); }
                    .cyber-btn.loading { animation: blink 1s infinite; cursor: wait; }
                    @keyframes blink { 50% { opacity: 0.5; } }
                    .cyber-alert { padding: 15px; margin-bottom: 20px; border-left: 4px solid; text-align: left; }
                    .cyber-alert.success { background: rgba(37, 211, 102, 0.1); border-color: #25D366; }
                    .cyber-alert.error { background: rgba(255, 75, 75, 0.1); border-color: #ff4b4b; }
                    .alert-title { margin: 0 0 10px 0; font-weight: bold; font-size: 14px; color: #fff; }
                    .code-box { background: #000; padding: 15px; border: 1px dashed #25D366; text-align: center; margin: 10px 0; }
                    .code-text { font-size: 32px; color: #25D366; font-weight: bold; letter-spacing: 4px; text-shadow: 0 0 10px rgba(37, 211, 102, 0.5); }
                    .alert-desc { color: #a0aab5; font-size: 12px; margin: 0; }
                    .cyber-footer { display: flex; justify-content: space-between; margin-top: 30px; border-top: 1px solid rgba(37, 211, 102, 0.2); padding-top: 20px; }
                    .footer-link { color: #00ffcc; text-decoration: none; font-size: 12px; transition: 0.3s; }
                    .footer-link:hover { text-shadow: 0 0 10px #00ffcc; }
                `}</style>
            </div>
        </>
    );
}
