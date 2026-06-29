import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthOverlay({ dispatch }) {
  const [view, setView] = useState("landing");
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();

  // Listen to URL to change view for Browser Back/Forward buttons
  useEffect(() => {
    if (location.pathname === "/auth/login") setView("login");
    else if (location.pathname === "/auth/register") setView("register");
    else setView("landing");
  }, [location.pathname]);

  // Update URL when clicking buttons
  const handleNavigation = (newView, url) => {
    setView(newView);
    setError("");
    navigate(url);
  };

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "", age: "", country: "", location: "", 
    nationality: "", citizenship: "", health_condition: "None", passport_expiry: "", passport_blank_pages: ""
  });

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
    
    const url = view === "login" ? "http://localhost:8000/api/auth/login" : "http://localhost:8000/api/auth/register";
    
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
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
                Register Passport
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
            <button onClick={() => handleNavigation("landing", "/auth")} className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors cursor-pointer">
              ← Back
            </button>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              {view === "login" ? "Secure Login" : "Passport Registration"}
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
                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">1. Credentials</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder="Full Name *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500 col-span-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="email" placeholder="Email Address *" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      <input type="password" placeholder="Secure Password *" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">2. Your Identity</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500 cursor-pointer">
                        <option value="" disabled>Who are you? *</option>
                        <option value="Student">Student</option>
                        <option value="Tourist">Tourist</option>
                        <option value="Business Professional">Business Professional</option>
                        <option value="Remote Worker / Nomad">Remote Worker / Nomad</option>
                        <option value="Expat / Relocating">Expat / Relocating</option>
                      </select>
                      <input type="number" placeholder="Age *" required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder="Current Country *" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      <input type="text" placeholder="Origin City/State *" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Nationality *" required value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                      <input type="text" placeholder="Citizenship *" required value={formData.citizenship} onChange={e => setFormData({...formData, citizenship: e.target.value})} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-violet-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700/50 pb-2">3. Health Profile</h3>
                    <select value={formData.health_condition} onChange={e => setFormData({...formData, health_condition: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-slate-300 outline-none focus:border-sky-500 cursor-pointer">
                      <option value="None">None (Healthy)</option>
                      <option value="Asthma">Asthma</option>
                      <option value="Diabetes">Diabetes</option>
                      <option value="Heart Condition">Heart Condition</option>
                      <option value="Hypertension">Hypertension</option>
                      <option value="Mobility Impairment">Mobility Impairment</option>
                      <option value="Severe Allergies">Severe Allergies</option>
                      <option value="Recent Surgery">Recent Surgery</option>
                      <option value="Other">Other Documented Disorder</option>
                    </select>
                  </div>

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
                {loading ? "AUTHENTICATING..." : (view === "login" ? "ENTER SYSTEM" : "INITIALIZE PASSPORT")}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}