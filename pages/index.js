import { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
    const [token, setToken] = useState(null);
    const [role, setRole] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Pairing State
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [pairError, setPairError] = useState("");

    // Admin State
    const [usersList, setUsersList] = useState([]);
    const [newUser, setNewUser] = useState("");
    const [newPass, setNewPass] = useState("");
    const [adminMsg, setAdminMsg] = useState("");

    useEffect(() => {
        const savedToken = localStorage.getItem("bot_token");
        const savedRole = localStorage.getItem("bot_role");
        const savedUser = localStorage.getItem("bot_username");
        if (savedToken) {
            setToken(savedToken);
            setRole(savedRole);
            setUsername(savedUser);
            if (savedRole === "owner") fetchUsers(savedToken);
        }
    }, []);

    async function handleLogin() {
        setIsLoading(true);
        setAuthError("");
        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "login", username, password })
            });
            const data = await res.json();
            if (data.success) {
                setToken(data.token);
                setRole(data.role);
                localStorage.setItem("bot_token", data.token);
                localStorage.setItem("bot_role", data.role);
                localStorage.setItem("bot_username", data.username);
                if (data.role === "owner") fetchUsers(data.token);
            } else {
                setAuthError(data.message);
            }
        } catch (e) { setAuthError("Network error"); }
        setIsLoading(false);
    }

    function handleLogout() {
        localStorage.clear();
        setToken(null); setRole(null); setUsername(""); setPassword("");
        setPhone(""); setCode("");
    }

    async function requestPairingCode() {
        setIsLoading(true);
        setPairError("");
        setCode("");
        try {
            const res = await fetch("/api/pairing", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();
            if (data.success) setCode(data.code);
            else setPairError(data.message || data.error);
        } catch (e) { setPairError("Network error"); }
        setIsLoading(false);
    }

    // ===== Admin Functions =====
    async function fetchUsers(tk) {
        const res = await fetch("/api/auth", { headers: { Authorization: `Bearer ${tk}` } });
        const data = await res.json();
        if (data.success) setUsersList(data.users);
    }

    async function createUser() {
        setAdminMsg("");
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: "create", newUsername: newUser, newPassword: newPass })
        });
        const data = await res.json();
        setAdminMsg(data.message);
        if (data.success) { setNewUser(""); setNewPass(""); fetchUsers(token); }
    }

    async function deleteUser(user) {
        const res = await fetch("/api/auth", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ username: user })
        });
        const data = await res.json();
        setAdminMsg(data.message);
        if (data.success) fetchUsers(token);
    }

    // ===== UI =====
    return (
        <>
            <Head><title>PANJSHIRI AI | Portal</title></Head>
            <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", fontFamily: "sans-serif", padding: "20px", direction: "ltr" }}>
                <main style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "40px 30px", maxWidth: "450px", width: "100%", textAlign: "center", color: "#fff" }}>
                    <img src="/logo.png" alt="Logo" style={{ width: "100px", height: "100px", borderRadius: "50%", marginBottom: "20px", border: "3px solid #25D366" }} />
                    
                    <h2 style={{ marginBottom: "20px", color: "#25D366" }}>PANJSHIRI AI</h2>

                    {!token ? (
                        // ================= LOGIN FORM =================
                        <div>
                            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "none", outline: "none" }} />
                            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "none", outline: "none" }} />
                            <button onClick={handleLogin} disabled={isLoading} style={{ width: "100%", padding: "12px", background: "#25D366", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                                {isLoading ? "Checking..." : "Login"}
                            </button>
                            {authError && <p style={{ color: "#ff4b4b", marginTop: "10px" }}>{authError}</p>}
                            
                            <p style={{ marginTop: "20px", fontSize: "13px", color: "#aaa" }}>
                                To buy an account, contact the owner:<br/>
                                <a href="https://wa.me/93794384087" style={{ color: "#25D366", fontWeight: "bold", textDecoration: "none" }}>+93 79 438 4087</a>
                            </p>
                        </div>
                    ) : (
                        // ================= LOGGED IN DASHBOARD =================
                        <div>
                            <p style={{ marginBottom: "20px" }}>Welcome, <b>{username}</b> ({role})<br/><button onClick={handleLogout} style={{ background: "transparent", color: "#ff4b4b", border: "none", cursor: "pointer", marginTop: "5px" }}>Logout</button></p>

                            {/* PAIRING SECTION */}
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px", marginBottom: "20px" }}>
                                <p style={{ marginBottom: "10px" }}>Connect your WhatsApp:</p>
                                <input type="tel" placeholder="Phone Number (e.g. 93794384087)" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "none", outline: "none" }} />
                                <button onClick={requestPairingCode} disabled={isLoading} style={{ width: "100%", padding: "12px", background: "#128C7E", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                                    {isLoading ? "Processing..." : "Get Pairing Code"}
                                </button>
                                {code && <div style={{ marginTop: "15px", background: "#25D366", color: "#000", padding: "15px", borderRadius: "8px" }}><b>Your Code:</b> <span style={{ fontSize: "24px", letterSpacing: "3px" }}>{code}</span></div>}
                                {pairError && <p style={{ color: "#ff4b4b", marginTop: "10px" }}>{pairError}</p>}
                            </div>

                            {/* ADMIN SECTION (Only visible to Owner) */}
                            {role === "owner" && (
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px", textAlign: "left" }}>
                                    <h3 style={{ color: "#25D366", fontSize: "18px", marginBottom: "10px" }}>Admin Panel</h3>
                                    
                                    <input type="text" placeholder="New Username" value={newUser} onChange={e => setNewUser(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "8px", borderRadius: "6px", border: "none" }} />
                                    <input type="text" placeholder="New Password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "8px", borderRadius: "6px", border: "none" }} />
                                    <button onClick={createUser} style={{ padding: "8px 16px", background: "#25D366", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", width: "100%", marginBottom: "10px" }}>Create User</button>
                                    {adminMsg && <p style={{ fontSize: "14px", color: "#ffd700" }}>{adminMsg}</p>}

                                    <h4 style={{ marginTop: "20px", fontSize: "15px" }}>User List:</h4>
                                    <ul style={{ listStyleType: "none", padding: 0 }}>
                                        {usersList.map(u => (
                                            <li key={u.username} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "14px" }}>
                                                {u.username}
                                                {u.username !== "shirzaipgr" && (
                                                    <button onClick={() => deleteUser(u.username)} style={{ background: "#ff4b4b", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}>Delete</button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
