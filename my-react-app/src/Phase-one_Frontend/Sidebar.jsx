import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import myCustomLogo from "/planeLogo.svg"

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

const BASIS_PRESETS = [
  "Cost of Living & Economy",
  "Safety, Healthcare & Wellness",
  "Culture, Lifestyle & Food",
  "Business & Tech Opportunities",
  "Tourism & Sightseeing",
  "Weather, Climate & Geography",
  "Visas & Immigration Friendliness"
];

export default function Sidebar({ state, dispatch, geoFeatures, triggerCountryFocus, fetchBriefing, fetchComparison }) {
  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState("search"); // "search" | "compare"
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);

  // --- SEARCH STATES ---
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showPurposeDrop, setShowPurposeDrop] = useState(false);
  
  // --- COMPARE STATES ---
  const [compareData, setCompareData] = useState({ countryA: "", countryB: "", purpose: "", basis: "" });
  const [showCompareCountryADrop, setShowCompareCountryADrop] = useState(false);
  const [showCompareCountryBDrop, setShowCompareCountryBDrop] = useState(false);
  const [showComparePurposeDrop, setShowComparePurposeDrop] = useState(false);
  const [showCompareBasisDrop, setShowCompareBasisDrop] = useState(false);

  // --- MODAL STATES ---
  const [historyData, setHistoryData] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileViewMode, setProfileViewMode] = useState("view");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [editFormData, setEditFormData] = useState({});
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [showRoleDrop, setShowRoleDrop] = useState(false);
  const [showHealthDrop, setShowHealthDrop] = useState(false);
  
  // --- REFS ---
  const countryRef = useRef(null);
  const purposeRef = useRef(null);
  const countryARef = useRef(null);
  const countryBRef = useRef(null);
  const comparePurposeRef = useRef(null);
  const compareBasisRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // ROUTING FOR SIDEBAR NESTED MODALS
  // ==========================================
  useEffect(() => {
    const path = location.pathname;
    
    // URL drives the Modals to open!
    if (path === '/homepage/global-cache') { setShowProfileModal(false); fetchGlobalArchive(false); }
    else if (path === '/homepage/archive') { setShowProfileModal(false); fetchPersonalArchive(false); }
    else if (path === '/homepage/history') { setShowProfileModal(false); fetchSearchHistory(false); }
    else if (path === '/homepage/travelled') { setShowProfileModal(false); fetchJourneysArchive(false); }
    else if (path === '/homepage/compare-history') { setShowProfileModal(false); fetchCompareHistory(false); } // NEW ROUTE
    else if (path === '/homepage/profile') { setShowHistoryModal(false); handleOpenProfile(false); }
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

  // Handle outside clicks for all dropdowns
  useEffect(() => {
    const handleClick = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) setShowCountryDrop(false);
      if (purposeRef.current && !purposeRef.current.contains(e.target)) setShowPurposeDrop(false);
      if (countryARef.current && !countryARef.current.contains(e.target)) setShowCompareCountryADrop(false);
      if (countryBRef.current && !countryBRef.current.contains(e.target)) setShowCompareCountryBDrop(false);
      if (comparePurposeRef.current && !comparePurposeRef.current.contains(e.target)) setShowComparePurposeDrop(false);
      if (compareBasisRef.current && !compareBasisRef.current.contains(e.target)) setShowCompareBasisDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // --- FILTERED LISTS ---
  const filteredCountries = useMemo(() => {
    if (!geoFeatures.length) return [];
    return geoFeatures.map(g => g.properties.name).filter(name => name?.toLowerCase().includes(state.countrySearch.toLowerCase())).sort((a, b) => a.localeCompare(b));
  }, [state.countrySearch, geoFeatures]);

  const filteredCountriesA = useMemo(() => geoFeatures.map(g => g.properties.name).filter(n => n?.toLowerCase().includes(compareData.countryA.toLowerCase())).sort((a, b) => a.localeCompare(b)), [compareData.countryA, geoFeatures]);
  const filteredCountriesB = useMemo(() => geoFeatures.map(g => g.properties.name).filter(n => n?.toLowerCase().includes(compareData.countryB.toLowerCase())).sort((a, b) => a.localeCompare(b)), [compareData.countryB, geoFeatures]);

  const getAuthHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    return headers;
  };

  // ==========================================
  // FETCHERS & LOGIC
  // ==========================================

  // 1. Global Cache
  const fetchGlobalArchive = async (isClick = true) => {
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

  // 2. Personal Archive
  const fetchPersonalArchive = async (isClick = true) => {
    if (!state.token) { alert("🔒 You must be logged in to view your Personal AI Archive!"); navigate('/auth'); return; }
    if (isClick) { navigate('/homepage/archive'); return; }
    setIsSidebarLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/briefings/archive`, { headers: getAuthHeaders() });
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("Personal AI Archive");
      setShowHistoryModal(true);
    } catch (error) { console.error("Personal archive fetch failed", error); }
    finally { setIsSidebarLoading(false); }
  };

  // 3. Search History
  const fetchSearchHistory = async (isClick = true) => {
    if (!state.token) { alert("🔒 You must be logged in to view your Search History!"); navigate('/auth'); return; }
    if (isClick) { navigate('/homepage/history'); return; }
    setIsSidebarLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/history`, { headers: getAuthHeaders() });
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("Recent Searches");
      setShowHistoryModal(true);
    } catch (error) { console.error("Search history fetch failed", error); }
    finally { setIsSidebarLoading(false); }
  };

  // 4. Travelled Journeys
  const fetchJourneysArchive = async (isClick = true) => {
    if (!state.token) { alert("🔒 You must be logged in to view your Archived Journeys!"); navigate('/auth'); return; }
    if (isClick) { navigate('/homepage/travelled'); return; }
    setIsSidebarLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/journey/history`, { headers: getAuthHeaders() });
      const result = await response.json();
      const formatted = (result.data || []).map(j => ({
        country: j.country, purpose: "Archived Travel Plan", timestamp: j.timestamp, isJourney: true, planData: j.plan
      }));
      setHistoryData(formatted);
      setModalTitle("Countries Travelled");
      setShowHistoryModal(true);
    } catch (error) { console.error("Archive fetch failed", error); }
    finally { setIsSidebarLoading(false); }
  };

  // 5. NEW: Compare History Fetcher
  const fetchCompareHistory = async (isClick = true) => {
    if (!state.token) { alert("🔒 You must be logged in to view your Compare History!"); navigate('/auth'); return; }
    if (isClick) { navigate('/homepage/compare-history'); return; }
    setIsSidebarLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/compare/history`, { headers: getAuthHeaders() });
      const result = await response.json();
      setHistoryData(result.data || []);
      setModalTitle("Comparison History");
      setShowHistoryModal(true);
    } catch (error) { console.error("Compare archive fetch failed", error); }
    finally { setIsSidebarLoading(false); }
  };

  // 6. Open Profile
  const handleOpenProfile = async (isClick = true) => {
    if (isClick) { navigate('/homepage/profile'); return; }
    setIsSidebarLoading(true);
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
      else if (response.status === 401) {
        dispatch({ type: "LOGOUT" }); // Force clear the bad token
        navigate('/auth'); // Send them to the login page
      }
      else {
        console.error("Failed to load profile", response.status);
      }
    } catch (error) { console.error("Failed to load profile", error); }
    finally { setIsSidebarLoading(false); }
  };

  // 7. Verify Password
  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    setIsSidebarLoading(true);
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
    finally { setIsSidebarLoading(false); }
  };

  // 8. Update Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    setIsSidebarLoading(true);
    try {
      const payload = { 
        ...editFormData, 
        age: editFormData.age ? parseInt(editFormData.age) : null,
        passport_blank_pages: editFormData.passport_blank_pages ? parseInt(editFormData.passport_blank_pages) : null
      };
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/user/profile`, {
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
    finally { setIsSidebarLoading(false); }
  };

  // ==========================================
  // INPUT VALIDATION LOGIC FOR BUTTONS & ERRORS
  // ==========================================
  const allValidCountryNames = useMemo(() => geoFeatures.map(g => g.properties.name), [geoFeatures]);

  const isSearchCountryValid = allValidCountryNames.includes(state.countrySearch);
  const showSearchError = state.countrySearch?.trim() !== "" && !isSearchCountryValid;

  const isCountryAValid = allValidCountryNames.includes(compareData.countryA);
  const showCountryAError = compareData.countryA?.trim() !== "" && !isCountryAValid;

  const isCountryBValid = allValidCountryNames.includes(compareData.countryB);
  const showCountryBError = compareData.countryB?.trim() !== "" && !isCountryBValid;

  const activeTheme = state.theme || "treasure";

  return (
    <div className={`
      w-[360px] min-w-[360px] h-full
      bg-[#0f172a]/50 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_30px_rgba(0,0,0,0.3)] 
      flex flex-col p-8 z-20 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${state.isBriefingActive || state.isCompareActive ? "-ml-[360px] border-r-transparent" : ""}
      relative
    `}>
      {/* GLOBAL LOADING OVERLAY */}
      {isSidebarLoading && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-r-xl">
          <div className="text-6xl animate-[spin_3s_linear_infinite] drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">🌍</div>
          <div className="mt-4 text-emerald-400 font-bold tracking-widest text-sm animate-pulse">JUST A SEC...</div>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-6">
        
        {/* Because it's in the public folder, you just use /logo.svg! */}
        <img src="/planeLogo.svg" alt="App Logo" className="w-10 h-10" />

        <h2 className="text-[1.6rem] font-extrabold text-slate-50 tracking-tight drop-shadow-sm">
          Atlas Intelligence
        </h2>
      </div>

      {/* --- TABBED ACCORDION HEADER --- */}
      <div className="flex w-full bg-slate-900 p-1 rounded-lg border border-slate-800 mb-6 shadow-inner">
        <button onClick={() => setActiveTab("search")} className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${activeTab === 'search' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Search</button>
        <button onClick={() => setActiveTab("compare")} className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${activeTab === 'compare' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Compare</button>
      </div>

      {/* ======================================= */}
      {/* TAB 1: STANDARD SEARCH                  */}
      {/* ======================================= */}
      {activeTab === "search" && (
        <div className="animate-[slideDownFade_0.3s_ease-out_forwards]">
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
            
            {/* --- NEW SEARCH ERROR MESSAGE --- */}
            {showSearchError && (
              <div className="text-red-400 text-[0.65rem] mt-1.5 font-semibold">
                Country you are looking for is not available, please select from dropdown.
              </div>
            )}

            {showCountryDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[200px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
                {filteredCountries.map(name => (
                  <div key={name} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white" onClick={() => { triggerCountryFocus(name); setShowCountryDrop(false); }}>{name}</div>
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
                  <div key={preset} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white" onClick={() => { dispatch({ type: "SET_PURPOSE", payload: preset }); setShowPurposeDrop(false); }}>{preset}</div>
                ))}
              </div>
            )}
          </div>

          <button 
            className={`
              w-full mt-2 p-4 rounded-lg font-bold text-[1.1rem] transition-all duration-200 uppercase tracking-widest
              ${isSearchCountryValid && !state.isLoading
                ? "bg-gradient-to-br from-violet-600 to-indigo-500 text-white cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:brightness-110 hover:-translate-y-[2px]" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"}
            `}
            onClick={() => fetchBriefing(state.countrySearch, state.purposeInput)}
            disabled={!isSearchCountryValid || state.isLoading}
          >
            {state.isLoading ? "GENERATING INTEL..." : "GO!"}
          </button>

        </div>
      )}

      {/* ======================================= */}
      {/* TAB 2: COMPARE COUNTRIES                */}
      {/* ======================================= */}
      {activeTab === "compare" && (
        <div className="animate-[slideDownFade_0.3s_ease-out_forwards] flex flex-col gap-4">
          
          <div className="relative" ref={countryARef}>
            <label className="text-[0.65rem] font-bold uppercase text-sky-400 mb-1 block">Country A</label>
            <div className="flex w-full">
              <input type="text" className="flex-1 p-2 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-sm outline-none focus:border-sky-500" placeholder="First country..." value={compareData.countryA} onChange={(e) => { setCompareData({...compareData, countryA: e.target.value}); setShowCompareCountryADrop(true); }} onFocus={() => setShowCompareCountryADrop(true)} />
              <button className="px-2 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-sky-500 transition-colors cursor-pointer" onClick={() => setShowCompareCountryADrop(!showCompareCountryADrop)}>▾</button>
            </div>
            
            {/* --- NEW COUNTRY A ERROR MESSAGE --- */}
            {showCountryAError && (
              <div className="text-red-400 text-[0.65rem] mt-1 font-semibold">
                Country you are looking for is not available, please select from dropdown.
              </div>
            )}

            {showCompareCountryADrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[150px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
                {filteredCountriesA.map(name => (<div key={name} className="p-2 text-sm text-slate-400 cursor-pointer hover:bg-sky-500 hover:text-white" onClick={() => { setCompareData({...compareData, countryA: name}); setShowCompareCountryADrop(false); }}>{name}</div>))}
              </div>
            )}
          </div>

          <div className="relative" ref={countryBRef}>
            <label className="text-[0.65rem] font-bold uppercase text-sky-400 mb-1 block">Country B</label>
            <div className="flex w-full">
              <input type="text" className="flex-1 p-2 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-sm outline-none focus:border-sky-500" placeholder="Second country..." value={compareData.countryB} onChange={(e) => { setCompareData({...compareData, countryB: e.target.value}); setShowCompareCountryBDrop(true); }} onFocus={() => setShowCompareCountryBDrop(true)} />
              <button className="px-2 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-sky-500 transition-colors cursor-pointer" onClick={() => setShowCompareCountryBDrop(!showCompareCountryBDrop)}>▾</button>
            </div>

            {/* --- NEW COUNTRY B ERROR MESSAGE --- */}
            {showCountryBError && (
              <div className="text-red-400 text-[0.65rem] mt-1 font-semibold">
                Country you are looking for is not available, please select from dropdown.
              </div>
            )}

            {showCompareCountryBDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[150px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
                {filteredCountriesB.map(name => (<div key={name} className="p-2 text-sm text-slate-400 cursor-pointer hover:bg-sky-500 hover:text-white" onClick={() => { setCompareData({...compareData, countryB: name}); setShowCompareCountryBDrop(false); }}>{name}</div>))}
              </div>
            )}
          </div>

          <div className="relative" ref={comparePurposeRef}>
            <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Context / Purpose</label>
            <div className="flex w-full">
              <input type="text" className="flex-1 p-2 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-sm outline-none focus:border-violet-500" placeholder="E.g. Relocation, Tourism" value={compareData.purpose} onChange={(e) => setCompareData({...compareData, purpose: e.target.value})} onFocus={() => setShowComparePurposeDrop(true)} />
              <button className="px-2 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 transition-colors cursor-pointer" onClick={() => setShowComparePurposeDrop(!showComparePurposeDrop)}>▾</button>
            </div>
            {showComparePurposeDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[150px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
                {PURPOSE_PRESETS.map(p => (<div key={p} className="p-2 text-sm text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white" onClick={() => { setCompareData({...compareData, purpose: p}); setShowComparePurposeDrop(false); }}>{p}</div>))}
              </div>
            )}
          </div>

          <div className="relative" ref={compareBasisRef}>
            <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Basis of Comparison</label>
            <div className="flex w-full">
              <input type="text" className="flex-1 p-2 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 text-sm outline-none focus:border-amber-500" placeholder="E.g. Cost of Living" value={compareData.basis} onChange={(e) => setCompareData({...compareData, basis: e.target.value})} onFocus={() => setShowCompareBasisDrop(true)} />
              <button className="px-2 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-amber-500 transition-colors cursor-pointer" onClick={() => setShowCompareBasisDrop(!showCompareBasisDrop)}>▾</button>
            </div>
            {showCompareBasisDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[150px] overflow-y-auto z-50 shadow-xl custom-scrollbar">
                {BASIS_PRESETS.map(b => (<div key={b} className="p-2 text-sm text-slate-400 cursor-pointer hover:bg-amber-500 hover:text-white" onClick={() => { setCompareData({...compareData, basis: b}); setShowCompareBasisDrop(false); }}>{b}</div>))}
              </div>
            )}
          </div>

          <button 
            className={`
              w-full mt-2 p-3 rounded-lg font-bold text-[1.1rem] transition-all duration-200 uppercase tracking-widest
              ${isCountryAValid && isCountryBValid 
                ? "bg-gradient-to-br from-sky-600 to-blue-500 text-white cursor-pointer shadow-[0_4px_20px_rgba(14,165,233,0.4)] hover:brightness-110 hover:-translate-y-[2px]" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"}
            `}
            onClick={() => {
              const finalBasis = compareData.basis.trim() === "" ? "General" : compareData.basis;
              fetchComparison({ ...compareData, basis: finalBasis });
            }}
            disabled={!isCountryAValid || !isCountryBValid}
          >
            COMPARE!
          </button>
        </div>
      )}

      <div className="flex-1"></div>

      {/* --- FOOTER: THEMES & PROFILE --- */}
      <div className="mt-4 flex items-center gap-3 pt-6 border-t border-white/10">
        <div className="flex-1 bg-slate-950 p-1.5 rounded-lg flex border border-slate-800 shadow-inner h-12">
          <button onClick={() => dispatch({ type: "SET_THEME", payload: "normal" })} className={`flex-1 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'normal' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>NORMAL</button>
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

      {/* ======================================= */}
      {/* MODAL 1: HISTORY & ARCHIVES             */}
      {/* ======================================= */}
      {showHistoryModal && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h3 className="text-[1.3rem] font-black text-violet-400 tracking-wide">{modalTitle}</h3>
            <button onClick={() => { setShowHistoryModal(false); navigate('/homepage/profile'); }} className="text-slate-500 hover:text-red-500 text-xl font-bold transition-colors cursor-pointer">✖</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {historyData.length > 0 ? historyData.map((item, i) => (
              item.isCompare ? (
                // --- NEW: COMPARISON HISTORY UI CARD ---
                <div 
                  key={i} 
                  onClick={() => {
                    setShowHistoryModal(false);
                    const ca = item.countryA.toLowerCase().replace(/\s+/g, '-');
                    const cb = item.countryB.toLowerCase().replace(/\s+/g, '-');
                    navigate(`/homepage/compare/${ca}-vs-${cb}`);

                    dispatch({ 
                      type: "SET_COMPARE_DATA", 
                      payload: {
                        countryA: item.countryA,
                        countryB: item.countryB,
                        purpose: item.purpose,
                        basis: item.basis,
                        listA: item.dataA,
                        listB: item.dataB
                      }
                    });
                  }}
                  className="bg-slate-900 p-4 rounded-xl transition-all border shadow-sm border-slate-800 hover:border-sky-500 cursor-pointer hover:bg-sky-600/10 hover:shadow-md"
                >
                  <div className="font-extrabold text-slate-100 text-[1.05rem] tracking-wide mb-1.5 flex items-center">
                    <span className="text-sky-400">{item.countryA}</span> 
                    <span className="text-slate-500 text-[0.7rem] mx-2 px-1 border border-slate-700 rounded-sm">VS</span> 
                    <span className="text-emerald-400">{item.countryB}</span>
                  </div>
                  <div className="text-[0.75rem] text-slate-400 font-medium flex flex-wrap items-center gap-2">
                    <span className="text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 truncate max-w-[150px]" title={item.basis}>{item.basis}</span>
                    <span className="truncate max-w-[100px]" title={item.purpose}>{item.purpose}</span>
                    <span className="ml-auto text-slate-500">{item.timestamp ? item.timestamp.split('T')[0] : ''}</span>
                  </div>
                </div>
              ) : (
                // --- EXISTING: STANDARD HISTORY UI CARD ---
                <div key={i} onClick={() => { 
                    if (item.isJourney) return; 

                    setShowHistoryModal(false);
                    triggerCountryFocus(item.country); 
                    
                    const cSlug = item.country.toLowerCase().replace(/\s+/g, '-');
                    
                    if (item.purpose && item.purpose !== "Quick Intel Scan") {
                      const pSlug = item.purpose.toLowerCase().replace(/[\s/]+/g, '-');
                      dispatch({ type: "SET_PURPOSE", payload: item.purpose });
                      fetchBriefing(item.country, item.purpose);
                      navigate(`/${cSlug}/${pSlug}/briefing`);
                    } else {
                      navigate(`/${cSlug}`);
                    }
                  }} 
                  className={`bg-slate-900 p-4 rounded-xl transition-all border shadow-sm ${item.isJourney ? 'border-emerald-500/30' : 'border-slate-800 hover:border-violet-500 cursor-pointer hover:bg-violet-600/20 hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-slate-100 text-[1.1rem] tracking-wide">{item.country}</div>
                      <div className="text-[0.75rem] text-slate-400 mt-1.5 font-medium flex items-center gap-4">
                        {item.purpose ? <span className="text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">{item.purpose}</span> : <span className="text-sky-400">Viewed</span>}
                        <span>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                    
                    {item.isJourney && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHistoryModal(false);
                          triggerCountryFocus(item.country);
                          dispatch({ type: "RESTORE_JOURNEY", payload: item.planData });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105 cursor-pointer border border-emerald-400"
                      >
                        Travel Again
                      </button>
                    )}
                  </div>
                </div>
              )
            )) : <div className="text-slate-500 italic text-center mt-12 text-sm font-semibold">No records found.</div>}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 2: USER PROFILE & SETTINGS        */}
      {/* ======================================= */}
      {showProfileModal && userProfile && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <h3 className="text-xl font-black text-white tracking-widest uppercase">
              {profileViewMode === "view" ? "Travel Profile" : profileViewMode === "verify" ? "Security Check" : "Edit Profile"}
            </h3>
            <button onClick={() => { setShowProfileModal(false); navigate('/homepage'); }} className="text-slate-400 hover:text-red-500 text-xl font-bold cursor-pointer">✖</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
            {profileMsg.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-bold text-center ${profileMsg.type === "error" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"}`}>
                {profileMsg.text}
              </div>
            )}

            {/* PROFILE VIEW MODE */}
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

                <button onClick={() => { setProfileViewMode("verify"); setProfileMsg({type:"", text:""}); }} className="w-full mt-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer">
                  Edit Profile
                </button>

                {/* --- HISTORY / ARCHIVE BUTTONS --- */}
                <div className="pt-6 mt-6 border-t border-slate-700 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Archives & History</h4>
                  <button onClick={() => fetchPersonalArchive(true)} className="w-full py-3 bg-slate-800/60 hover:bg-slate-700 border border-violet-500/30 rounded-lg text-violet-300 text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                    Personal AI Archive
                  </button>
                  <button onClick={() => fetchSearchHistory(true)} className="w-full py-3 bg-slate-800/60 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 text-sm font-semibold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                    Search History
                  </button>
                  <button onClick={() => fetchJourneysArchive(true)} className="w-full py-3 bg-slate-800/60 hover:bg-slate-700 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm font-semibold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                    Countries Travelled
                  </button>
                  {/* NEW COMPARE HISTORY BUTTON */}
                  <button onClick={() => fetchCompareHistory(true)} className="w-full py-3 bg-slate-800/60 hover:bg-slate-700 border border-sky-500/30 rounded-lg text-sky-300 text-sm font-semibold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                    Compare History
                  </button>
                </div>

              </div>
            )}

            {/* PASSWORD VERIFY MODE */}
            {profileViewMode === "verify" && (
              <form onSubmit={handleVerifyPassword} className="flex-1 flex flex-col justify-center gap-4">
                <p className="text-slate-400 text-sm text-center mb-2">Please verify your password to edit your travel identity.</p>
                <input type="password" required placeholder="Enter Password" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-violet-500" />
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg cursor-pointer">Verify Secure Access</button>
                <button type="button" onClick={() => { setProfileViewMode("view"); setProfileMsg({type:"", text:""}); }} className="w-full bg-transparent text-slate-500 hover:text-white font-bold py-2 transition-colors cursor-pointer">Cancel</button>
              </form>
            )}

            {/* EDIT PROFILE MODE */}
            {profileViewMode === "edit" && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <input type="text" placeholder="Full Name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" />
                
                <div className="grid grid-cols-2 gap-3">
                {/* --- CUSTOM ROLE INPUT + DROPDOWN --- */}
                <div className="relative flex min-w-0">
                  <input 
                    placeholder="Role" 
                    required 
                    value={editFormData.role} 
                    onChange={e => setEditFormData({...editFormData, role: e.target.value})} 
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 border-r-0 rounded-l-lg p-3 text-white outline-none focus:border-sky-500" 
                  />
                  <button type="button" onClick={() => setShowRoleDrop(!showRoleDrop)} className="px-3 bg-slate-900 border border-slate-700 border-l-0 rounded-r-lg text-slate-500 hover:text-sky-500 cursor-pointer flex-none">▾</button>
                  
                  {showRoleDrop && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl py-1 overflow-hidden">
                      {["Student", "Tourist", "Business Professional", "Remote Worker / Nomad", "Expat / Relocating"].map(r => (
                        <div key={r} onClick={() => { setEditFormData({...editFormData, role: r}); setShowRoleDrop(false); }} className="px-4 py-2 hover:bg-sky-600 hover:text-white cursor-pointer text-slate-300 text-sm">{r}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* --- AGE INPUT --- */}
                <input 
                  type="number" 
                  placeholder="Age" 
                  required 
                  value={editFormData.age} 
                  onChange={e => setEditFormData({...editFormData, age: e.target.value})} 
                  className="w-full min-w-0 bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-sky-500" 
                />
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
                
                {/* --- CUSTOM HEALTH INPUT + DROPDOWN --- */}
                <div className="relative flex">
                  <input 
                    placeholder="Health Condition" 
                    value={editFormData.health_condition} 
                    onChange={e => setEditFormData({...editFormData, health_condition: e.target.value})} 
                    className="flex-1 bg-slate-900 border border-slate-700 border-r-0 rounded-l-lg p-3 text-slate-300 outline-none focus:border-pink-500" 
                  />
                  <button type="button" onClick={() => setShowHealthDrop(!showHealthDrop)} className="px-3 bg-slate-900 border border-slate-700 border-l-0 rounded-r-lg text-slate-500 hover:text-pink-500 cursor-pointer">▾</button>
                  
                  {showHealthDrop && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl py-1 overflow-hidden">
                      {["None (Healthy)", "Asthma", "Diabetes", "Heart Condition", "Hypertension", "Other Documented Disorder"].map(h => (
                        <div key={h} onClick={() => { setEditFormData({...editFormData, health_condition: h}); setShowHealthDrop(false); }} className="px-4 py-2 hover:bg-pink-600 hover:text-white cursor-pointer text-slate-300 text-sm">{h}</div>
                      ))}
                    </div>
                  )}
                </div>

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