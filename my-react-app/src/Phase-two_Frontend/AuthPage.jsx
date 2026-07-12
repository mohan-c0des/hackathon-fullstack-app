import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ROLE_PRESETS = [
  "Student", "Tourist", "Business Professional", 
  "Remote Worker / Nomad", "Expat / Relocating"
];

const HEALTH_PRESETS = [
  "None (Healthy)", "Asthma", "Diabetes", "Heart Condition", 
  "Hypertension", "Mobility Impairment", "Severe Allergies", "Other"
];

export default function AuthOverlay({ dispatch }) {
  const [view, setView] = useState("landing");
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showRoleDrop, setShowRoleDrop] = useState(false);
  const [showHealthDrop, setShowHealthDrop] = useState(false);
  
  const roleRef = useRef(null);
  const healthRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle clicking outside custom dropdowns
  useEffect(() => {
    const handleClick = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) setShowRoleDrop(false);
      if (healthRef.current && !healthRef.current.contains(e.target)) setShowHealthDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Listen to URL to change view for Browser Back/Forward buttons
  useEffect(() => {
    if (location.pathname === "/auth/login") setView("login");
    else if (location.pathname === "/auth/register") setView("register");
    else setView("landing");
  }, [location.pathname]);

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "", age: "", country: "", state: "", city: "", 
    nationality: "", citizenship: "", health_condition: "", passport_expiry: "", passport_blank_pages: "", bio: ""
  });

  // Update URL when clicking buttons AND clear form data if registering
  const handleNavigation = (newView, url) => {
    if (newView === "register") {
      setFormData({
        name: "", email: "", password: "", role: "", age: "", country: "", state: "", city: "", 
        nationality: "", citizenship: "", health_condition: "", passport_expiry: "", passport_blank_pages: "", bio: ""
      });
    }
    setView(newView);
    setError("");
    navigate(url);
  };

  const completeAuth = (token) => {
    setIsExiting(true);
    setTimeout(() => {
      if (token) {
        localStorage.setItem("atlas_token", token);
        dispatch({ type: "LOGIN_SUCCESS", payload: token });
      } else {
        dispatch({ type: "SKIP_LOGIN" });
      }
      navigate('/homepage'); 
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const url = view === "login" ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
    
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Merge City and State so the backend doesn't crash on 'origin_city'
          origin_city: `${formData.city}, ${formData.state}`, 
          age: formData.age ? parseInt(formData.age) : null,
          passport_blank_pages: formData.passport_blank_pages ? parseInt(formData.passport_blank_pages) : null
        })
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.detail && Array.isArray(data.detail)) {
          const missingFields = data.detail.map(d => d.loc[d.loc.length - 1]).join(", ");
          throw new Error(`Validation Error: Please check ${missingFields}`);
        }
        throw new Error(data.detail || "Authentication failed");
      }
      completeAuth(data.access_token);
    } catch (err) {
      setError(err.message); setLoading(false);
    }
  };

  return (
    <div className={`
      absolute inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4 overflow-hidden
      transition-all duration-[1500ms] ease-in-out
      ${isExiting ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"}
    `}>
      <style>{`
        @keyframes floatSlow { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes floatFast { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(-10deg); } }
        .float-1 { animation: floatSlow 6s ease-in-out infinite; }
        .float-2 { animation: floatFast 8s ease-in-out infinite; }
        .glass-panel { background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .auth-scroll::-webkit-scrollbar { width: 6px; }
        .auth-scroll::-webkit-scrollbar-track { background: transparent; }
        .auth-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
      `}</style>

      {/* BACKGROUND FLOATING STICKERS */}
      <div className="absolute top-[15%] left-[15%] text-7xl float-1 opacity-60">✈️</div>
      <div className="absolute bottom-[20%] right-[15%] text-8xl float-2 opacity-40">🌍</div>
      <div className="absolute top-[25%] right-[25%] text-6xl float-1 opacity-50 shadow-xl rounded-full">🧭</div>
      <div className="absolute bottom-[25%] left-[20%] text-6xl float-2 opacity-50">🛂</div>

      {view === "landing" && (
        <div className="relative z-10 flex flex-col items-center justify-center animate-[slideDownFade_0.4s_ease-out_forwards]">
          <h1 className="text-5xl font-black text-white tracking-widest mb-2 drop-shadow-2xl">WELCOME TO ATLAS</h1>
          <p className="text-slate-400 font-semibold tracking-widest uppercase mb-16 text-sm">Global Travel Intelligence</p>

          <div className="flex gap-6 mb-8 w-full max-w-2xl px-6">
            <div className="flex-1 flex flex-col group">
              <button onClick={() => handleNavigation("login", "/auth/login")} className="py-5 glass-panel text-white font-bold text-lg rounded-xl hover:bg-violet-600/50 hover:border-violet-400 transition-all shadow-lg hover:shadow-violet-500/20 hover:-translate-y-1 cursor-pointer">
                System Login
              </button>
              <p className="text-slate-500 text-xs text-center mt-3 font-medium transition-colors group-hover:text-violet-300">Access your personal AI archives</p>
            </div>
            
            <div className="flex-1 flex flex-col group">
              <button onClick={() => handleNavigation("register", "/auth/register")} className="py-5 glass-panel text-white font-bold text-lg rounded-xl hover:bg-sky-600/50 hover:border-sky-400 transition-all shadow-lg hover:shadow-sky-500/20 hover:-translate-y-1 cursor-pointer">
                Register
              </button>
              <p className="text-slate-500 text-xs text-center mt-3 font-medium transition-colors group-hover:text-sky-300">Create a secure travel profile</p>
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col group mt-4">
            <button onClick={() => completeAuth(null)} className="py-4 glass-panel border-slate-700 text-slate-300 font-semibold rounded-full hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer">
              Continue as Guest
            </button>
            <p className="text-slate-600 text-[11px] text-center mt-3 font-medium">Use intelligence tools. No history saved.</p>
          </div>
        </div>
      )}

      {view !== "landing" && (
        <div className="relative z-10 glass-panel w-full max-w-3xl h-[75vh] min-h-[500px] rounded-3xl p-8 flex flex-col animate-[slideDownFade_0.3s_ease-out_forwards]">
          
          <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
            <button type="button" onClick={() => handleNavigation("landing", "/auth")} className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors cursor-pointer">
              ← Back
            </button>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              {view === "login" ? "Login Profile" : "Profile Registration"}
            </h2>
            <div className="w-[60px]"></div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {error && <div className="mb-4 bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg text-sm text-center font-bold flex-none">{error}</div>}
            
            <div className="flex-1 overflow-y-auto auth-scroll pr-4 pb-4">
              {/* LOGIN FORM */}
              {view === "login" && (
                <div className="flex flex-col gap-6 max-w-md mx-auto mt-10">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Address</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-violet-500 focus:bg-slate-900 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
                    <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-violet-500 focus:bg-slate-900 transition-colors" />
                  </div>
                </div>
              )}

              {/* REGISTER FORM */}
              {view === "register" && (
                <div className="space-y-8">
                  
                  {/* Section 1 */}
                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">1. Credentials</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Full Name *</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Email Address *</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Secure Password *</label>
                        <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">2. Your Identity</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="relative" ref={roleRef}>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Who are you? *</label>
                        <div className="flex w-full">
                          <input type="text" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="bg-slate-900/50 border border-slate-700 border-r-0 p-3 rounded-l-lg text-white outline-none focus:border-sky-500 w-full" placeholder="Type or select..." />
                          <button type="button" onClick={() => setShowRoleDrop(!showRoleDrop)} className="bg-slate-900/50 border border-slate-700 rounded-r-lg px-3 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer">▾</button>
                        </div>
                        {showRoleDrop && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl overflow-hidden">
                            {ROLE_PRESETS.map(r => <div key={r} onClick={() => { setFormData({...formData, role: r}); setShowRoleDrop(false); }} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-sky-500 hover:text-white transition-colors">{r}</div>)}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Age *</label>
                        <input type="number" required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Bio / Travel Style (Optional)</label>
                      <textarea rows="2" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Anything You Wanna Share.." className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500 resize-none"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Current Country *</label>
                        <input type="text" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">State / Province *</label>
                        <input type="text" required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">City *</label>
                        <input type="text" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nationality *</label>
                        <input type="text" required value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Citizenship *</label>
                        <input type="text" required value={formData.citizenship} onChange={e => setFormData({...formData, citizenship: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">3. Health Profile</h3>
                    <div className="relative" ref={healthRef}>
                      <div className="flex w-full">
                        <input type="text" value={formData.health_condition} onChange={e => setFormData({...formData, health_condition: e.target.value})} className="bg-slate-900/50 border border-slate-700 border-r-0 p-3 rounded-l-lg text-white outline-none focus:border-sky-500 w-full" placeholder="Any health conditions?" />
                        <button type="button" onClick={() => setShowHealthDrop(!showHealthDrop)} className="bg-slate-900/50 border border-slate-700 rounded-r-lg px-3 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer">▾</button>
                      </div>
                      {showHealthDrop && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl overflow-hidden">
                          {HEALTH_PRESETS.map(h => <div key={h} onClick={() => { setFormData({...formData, health_condition: h}); setShowHealthDrop(false); }} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-sky-500 hover:text-white transition-colors">{h}</div>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4 */}
                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">4. Passport Specs (Optional)</h3>
                    <div className="grid grid-cols-2 gap-4 pb-6">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Expiry Date</label>
                        <input type="date" value={formData.passport_expiry} onChange={e => setFormData({...formData, passport_expiry: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-slate-300 outline-none focus:border-sky-500 cursor-pointer" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Blank Pages Left</label>
                        <input type="number" placeholder="e.g. 4" value={formData.passport_blank_pages} onChange={e => setFormData({...formData, passport_blank_pages: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-none pt-6 border-t border-slate-700 mt-4">
              <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg text-lg ${view === "login" ? "bg-violet-600 hover:bg-violet-500" : "bg-sky-600 hover:bg-sky-500"} disabled:opacity-50 cursor-pointer`}>
                {loading ? "AUTHENTICATING..." : (view === "login" ? "ENTER SYSTEM" : "CREATE & ENTER")}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}