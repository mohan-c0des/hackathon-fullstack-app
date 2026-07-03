import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 

const PURPOSE_PRESETS = [
  "Academic / Studying",
  "Travel / Tourism",
  "Family & Friends",
  "Medical / Health",
  "Business Operations",
  "Relocation",
  "Cultural / Heritage Exploration",
  "Adventure / Sports"
];

export default function Sidebar({ state, dispatch, geoFeatures, triggerCountryFocus, fetchBriefing }) {
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showPurposeDrop, setShowPurposeDrop] = useState(false);
  
  const [historyData, setHistoryData] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileViewMode, setProfileViewMode] = useState("view");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [editFormData, setEditFormData] = useState({});
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  
  const countryRef = useRef(null);
  const purposeRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // FIX 2: ROUTING FOR SIDEBAR NESTED MODALS
  // ==========================================
  useEffect(() => {
    const path = location.pathname;
    
    // URL drives the Modals to open!
    if (path === '/homepage/global-cache') fetchGlobalArchive(false);
    else if (path === '/homepage/archive') fetchPersonalArchive(false);
    else if (path === '/homepage/history') fetchSearchHistory(false);
    else if (path === '/homepage/profile') handleOpenProfile(false);
    else {
      setShowHistoryModal(false);
      setShowProfileModal(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!state.token) {
      setShowProfileModal(false);
      setUserProfile(null);
      setProfileViewMode("view");
      setProfileMsg({ type: "", text: "" });
    }
  }, [state.token]);

  useEffect(() => {
    const handleClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) setShowCountryDrop(false);
      if (purposeRef.current && !purposeRef.current.contains(e.target)) setShowPurposeDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCountries = useMemo(() => {
    if (!geoFeatures.length) return [];
    return geoFeatures
      .map(g => g.properties.name)
      .filter(name => name?.toLowerCase().includes(state.countrySearch.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }, [state.countrySearch, geoFeatures]);

  const getAuthHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    return headers;
  };

  // --- ARCHIVE FETCHERS ---
  const fetchGlobalArchive = async (isClick = true) => {
    // Navigate to nested URL
    if (isClick) { navigate('/homepage/global-cache'); return; } 
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/briefings/global`);
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("🌍 Global Cache (Dev)");
      setShowHistoryModal(true);
    } catch (error) { console.error("Global archive fetch failed", error); }
  };

  const fetchPersonalArchive = async (isClick = true) => {
    if (!state.token) {
      alert("🔒 You must be logged in to view your Personal AI Archive!");
      navigate('/auth'); 
      return;
    }
    // Navigate to nested URL
    if (isClick) { navigate('/homepage/archive'); return; }
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/briefings/archive`, { headers: getAuthHeaders() });
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("Personal AI Archive");
      setShowHistoryModal(true);
    } catch (error) { console.error("Personal archive fetch failed", error); }
  };

  const fetchSearchHistory = async (isClick = true) => {
    if (!state.token) {
      alert("🔒 You must be logged in to view your Search History!");
      navigate('/auth');
      return;
    }
    // Navigate to nested URL
    if (isClick) { navigate('/homepage/history'); return; }
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/history`, { headers: getAuthHeaders() });
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("Recent Searches");
      setShowHistoryModal(true);
    } catch (error) { console.error("Search history fetch failed", error); }
  };

  // --- PROFILE HANDLERS ---
  const handleOpenProfile = async (isClick = true) => {
    // Navigate to nested URL
    if (isClick) { navigate('/homepage/profile'); return; }
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/user/profile`, { headers: getAuthHeaders() });
      if (response.ok) {
        const json = await response.json();
        setUserProfile(json.data);
        setEditFormData({
          name: json.data.name || "", role: json.data.role || "", age: json.data.age || "",
          country: json.data.country || "", origin_city: json.data.origin_city || "", 
          nationality: json.data.nationality || "", citizenship: json.data.citizenship || "", 
          health_condition: json.data.health_condition || "None", passport_expiry: json.data.passport_expiry || "",
          passport_blank_pages: json.data.passport_blank_pages || ""
        });
        setProfileViewMode("view");
        setProfileMsg({ type: "", text: "" });
        setShowProfileModal(true);
      }
    } catch (error) { console.error("Failed to load profile", error); }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/user/verify-password`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ password: verifyPassword })
      });
      if (response.ok) {
        setProfileViewMode("edit");
        setVerifyPassword("");
      } else {
        const errData = await response.json();
        setProfileMsg({ type: "error", text: errData.detail || "Incorrect Password" });
      }
    } catch (error) { setProfileMsg({ type: "error", text: "Verification failed." }); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const payload = { 
        ...editFormData, 
        age: editFormData.age ? parseInt(editFormData.age) : null,
        passport_blank_pages: editFormData.passport_blank_pages ? parseInt(editFormData.passport_blank_pages) : null
      };
      
      const response = await fetch(`${API_URL}/api/user/profile` , {
        method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setUserProfile(payload);
        setProfileViewMode("view");
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      } else {
        const errData = await response.json();
        setProfileMsg({ type: "error", text: errData.detail || "Failed to update profile" });
      }
    } catch (error) { setProfileMsg({ type: "error", text: "Update failed." }); }
  };

  const activeTheme = state.theme || "treasure";

  return (
    <div className={`
      w-[360px] min-w-[360px] h-full
      bg-[#0f172a]/50 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_30px_rgba(0,0,0,0.3)] 
      flex flex-col p-8 z-20 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${state.isBriefingActive ? "-ml-[360px] border-r-transparent" : ""}
      relative
    `}>
      <h2 className="text-[1.6rem] font-extrabold mb-2 text-slate-50 tracking-tight drop-shadow-sm">
        Travel Intelligence
      </h2>
      <p className="text-[0.85rem] text-slate-300/80 mb-8 leading-relaxed">Enter Country To Travel & Purpose Of Visit</p>
      
      <div className="mb-6 relative" ref={countryRef}>
        <label className="text-[0.75rem] font-semibold uppercase text-slate-400 mb-2 block">Target Geography</label>
        <div className="flex w-full">
          <input 
            type="text" className="flex-1 p-3 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-[0.95rem] outline-none focus:border-violet-500"
            placeholder="Type to search country..." value={state.countrySearch}
            onChange={(e) => { dispatch({ type: "SET_SEARCH", payload: e.target.value }); setShowCountryDrop(true); }}
            onFocus={() => setShowCountryDrop(true)}
          />
          <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setShowCountryDrop(!showCountryDrop)}>▾</button>
        </div>
        
        {showCountryDrop && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[200px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
            {filteredCountries.map(name => (
              <div key={name} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white" onClick={() => { triggerCountryFocus(name); setShowCountryDrop(false); }}>
                {name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 relative" ref={purposeRef}>
        <label className="text-[0.75rem] font-semibold uppercase text-slate-400 mb-2 block">Objective</label>
        <div className="flex w-full">
          <input 
            type="text" className="flex-1 p-3 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-[0.95rem] outline-none focus:border-violet-500"
            placeholder="Enter context or pick option..." value={state.purposeInput}
            onChange={(e) => dispatch({ type: "SET_PURPOSE", payload: e.target.value })}
          />
          <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setShowPurposeDrop(!showPurposeDrop)}>▾</button>
        </div>

        {showPurposeDrop && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl custom-scrollbar">
            {PURPOSE_PRESETS.map(preset => (
              <div key={preset} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white" onClick={() => { dispatch({ type: "SET_PURPOSE", payload: preset }); setShowPurposeDrop(false); }}>
                {preset}
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className={`
          mt-4 p-4 rounded-lg font-bold text-[1.1rem] transition-all duration-200
          ${state.selectedCountry && !state.isLoading
            ? "bg-gradient-to-br from-gray-200 to-gray-500 text-white cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:brightness-110 hover:-translate-y-[2px]" 
            : "bg-slate-700 text-slate-500 cursor-not-allowed"}
        `}
        onClick={() => fetchBriefing(state.selectedCountry, state.purposeInput)}
        disabled={!state.selectedCountry || state.isLoading}
      >
        {state.isLoading ? "GENERATING INTEL..." : "GO!"}
      </button>

      <div className="flex-1"></div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <button onClick={() => fetchGlobalArchive(true)} className="w-full py-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">
          🌍 Global Cache (Dev)
        </button>
        <button onClick={() => fetchPersonalArchive(true)} className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-violet-500/50 rounded-lg text-violet-300 text-sm font-bold tracking-wide transition-all shadow-[0_0_10px_rgba(139,92,246,0.1)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer flex items-center justify-center gap-2">
          Personal AI Archive
        </button>
        <button onClick={() => fetchSearchHistory(true)} className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 text-sm font-semibold tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2">
          Search History
        </button>
        <button className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 text-sm font-semibold tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2">
          Countries Travelled
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 bg-slate-950 p-1.5 rounded-lg flex border border-slate-800 shadow-inner h-12">
          <button onClick={() => dispatch({ type: "SET_THEME", payload: "light" })} className={`flex-1 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'light' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>LIGHT</button>
          <button onClick={() => dispatch({ type: "SET_THEME", payload: "dark" })} className={`flex-1 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'dark' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>DARK</button>
          <button onClick={() => dispatch({ type: "SET_THEME", payload: "treasure" })} className={`flex-1 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'treasure' ? 'bg-[#1b5949] text-amber-100 shadow-md border border-[#dbb086a9]' : 'text-slate-500 hover:text-slate-300'}`}>TREASURE</button>
        </div>

        {state.token ? (
          <button onClick={() => handleOpenProfile(true)} className="w-12 h-12 flex-none bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:scale-105 transition-all cursor-pointer border-2 border-slate-900" title="View Profile">
            <span className="text-xl">👤</span>
          </button>
        ) : (
          <button onClick={() => { dispatch({ type: "LOGOUT" }); navigate('/auth'); }} className="flex-none px-4 h-12 bg-sky-600 hover:bg-sky-500 rounded-full font-bold text-white text-xs tracking-wider shadow-lg hover:shadow-sky-500/30 transition-all cursor-pointer border border-sky-400/50">
            LOG IN
          </button>
        )}
      </div>

      {showHistoryModal && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h3 className="text-[1.3rem] font-black text-violet-400 tracking-wide">{modalTitle}</h3>
            <button onClick={() => navigate('/homepage')} className="text-slate-500 hover:text-red-500 text-xl font-bold transition-colors cursor-pointer">✖</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {historyData.length > 0 ? historyData.map((item, i) => (
              <div key={i} onClick={() => { 
                  // 1. Close the modal immediately
                  setShowHistoryModal(false);
                  triggerCountryFocus(item.country); 
                  
                  // 2. Generate the safe URL slugs
                  const cSlug = item.country.toLowerCase().replace(/\s+/g, '-');
                  
                  // 3. If it's a Briefing, jump straight to the full briefing URL!
                  if (item.purpose && item.purpose !== "Quick Intel Scan") {
                    const pSlug = item.purpose.toLowerCase().replace(/[\s/]+/g, '-');
                    dispatch({ type: "SET_PURPOSE", payload: item.purpose });
                    fetchBriefing(item.country, item.purpose);
                    navigate(`/${cSlug}/${pSlug}/briefing`);
                  } else {
                    // Otherwise, just jump to the country map view
                    navigate(`/${cSlug}`);
                  }
                }} 
                className="bg-slate-900 p-4 rounded-xl cursor-pointer hover:bg-violet-600/20 transition-all border border-slate-800 hover:border-violet-500 shadow-sm hover:shadow-md"
              >
                <div className="font-extrabold text-slate-100 text-[1.1rem] tracking-wide">{item.country}</div>
                <div className="text-[0.75rem] text-slate-400 mt-1.5 font-medium flex justify-between items-center">
                  {item.purpose ? <span className="text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">{item.purpose}</span> : <span className="text-sky-400">Viewed</span>}
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            )) : <div className="text-slate-500 italic text-center mt-12 text-sm font-semibold">No records found.</div>}
          </div>
        </div>
      )}

      {showProfileModal && userProfile && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <h3 className="text-xl font-black text-white tracking-widest uppercase">
              {profileViewMode === "view" ? "Travel Profile" : profileViewMode === "verify" ? "Security Check" : "Edit Profile"}
            </h3>
            <button onClick={() => navigate('/homepage')} className="text-slate-400 hover:text-red-500 text-xl font-bold cursor-pointer">✖</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
            {profileMsg.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-bold text-center ${profileMsg.type === "error" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"}`}>
                {profileMsg.text}
              </div>
            )}

            {profileViewMode === "view" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div>
                    <h4 className="text-white font-bold text-lg">{userProfile.name}</h4>
                    <p className="text-slate-400 text-xs">{userProfile.email}</p>
                  </div>
                  <button onClick={() => { dispatch({ type: "LOGOUT" }); navigate('/auth'); }} className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer">Log Out</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-sky-400 uppercase block mb-1">Role</span><span className="text-sm font-semibold text-slate-200">{userProfile.role || "-"}</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-sky-400 uppercase block mb-1">Age</span><span className="text-sm font-semibold text-slate-200">{userProfile.age || "-"}</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-sky-400 uppercase block mb-1">Country</span><span className="text-sm font-semibold text-slate-200">{userProfile.country || "-"}</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-sky-400 uppercase block mb-1">City</span><span className="text-sm font-semibold text-slate-200">{userProfile.origin_city || "-"}</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-sky-400 uppercase block mb-1">Citizenship</span><span className="text-sm font-semibold text-slate-200">{userProfile.citizenship || "-"}</span></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"><span className="text-[10px] text-pink-400 uppercase block mb-1">Health Data</span><span className="text-sm font-semibold text-slate-200">{userProfile.health_condition || "None"}</span></div>
                </div>

                <button onClick={() => { setProfileViewMode("verify"); setProfileMsg({type:"", text:""}); }} className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer">
                  Edit Profile
                </button>
              </div>
            )}

            {profileViewMode === "verify" && (
              <form onSubmit={handleVerifyPassword} className="flex-1 flex flex-col justify-center gap-4">
                <p className="text-slate-400 text-sm text-center mb-2">Please verify your password to edit your travel identity.</p>
                <input type="password" required placeholder="Enter Password" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-violet-500" />
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg cursor-pointer">Verify Secure Access</button>
                <button type="button" onClick={() => { setProfileViewMode("view"); setProfileMsg({type:"", text:""}); }} className="w-full bg-transparent text-slate-500 hover:text-white font-bold py-2 transition-colors cursor-pointer">Cancel</button>
              </form>
            )}

            {profileViewMode === "edit" && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <input type="text" placeholder="Full Name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                <div className="grid grid-cols-2 gap-3">
                  <select required value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500 cursor-pointer">
                    <option value="" disabled>Select Role</option>
                    <option>Student</option><option>Tourist</option><option>Business Professional</option><option>Remote Worker / Nomad</option><option>Expat / Relocating</option>
                  </select>
                  <input type="number" placeholder="Age" required value={editFormData.age} onChange={e => setEditFormData({...editFormData, age: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Country" required value={editFormData.country} onChange={e => setEditFormData({...editFormData, country: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                  <input type="text" placeholder="City" required value={editFormData.origin_city} onChange={e => setEditFormData({...editFormData, origin_city: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Nationality" required value={editFormData.nationality} onChange={e => setEditFormData({...editFormData, nationality: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                  <input type="text" placeholder="Citizenship" required value={editFormData.citizenship} onChange={e => setEditFormData({...editFormData, citizenship: e.target.value})} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                </div>
                <h4 className="text-pink-400 font-bold text-xs uppercase pt-2 border-t border-slate-700">Health & Passport</h4>
                <select value={editFormData.health_condition} onChange={e => setEditFormData({...editFormData, health_condition: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-300 outline-none focus:border-pink-500 cursor-pointer">
                  <option value="None">None (Healthy)</option><option value="Asthma">Asthma</option><option value="Diabetes">Diabetes</option><option value="Heart Condition">Heart Condition</option><option value="Hypertension">Hypertension</option><option value="Other">Other Documented Disorder</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={editFormData.passport_expiry} onChange={e => setEditFormData({...editFormData, passport_expiry: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-400 outline-none focus:border-amber-500 cursor-pointer" />
                  <input type="number" placeholder="Blank Pages" value={editFormData.passport_blank_pages} onChange={e => setEditFormData({...editFormData, passport_blank_pages: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-amber-500" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setProfileViewMode("view"); setProfileMsg({type:"", text:""}); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg cursor-pointer">Save Changes</button>
                </div>
              </form>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}