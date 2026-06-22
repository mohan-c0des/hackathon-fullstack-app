import React, { useState, useMemo, useRef, useEffect } from "react";

const PURPOSE_PRESETS = [
  "Academic / Studying",
  "Travel / Tourism",
  "Family & Friends",
  "Business Operations"
];

export default function Sidebar({ state, dispatch, geoFeatures, triggerCountryFocus, fetchBriefing }) {
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showPurposeDrop, setShowPurposeDrop] = useState(false);
  
  // Search History State
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // NEW: Briefing Archive State
  const [briefingHistory, setBriefingHistory] = useState([]);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  
  const countryRef = useRef(null);
  const purposeRef = useRef(null);

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

  // Fetch standard search clicks
  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/history/${state.userId}`);
      const result = await response.json();
      setHistory(result.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("History fetch failed:", error);
    }
  };

  // NEW: Fetch Generated AI Briefings
  const fetchBriefingArchive = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/briefings/${state.userId}`);
      const result = await response.json();
      setBriefingHistory(result.data || []);
      setShowBriefingModal(true);
    } catch (error) {
      console.error("Briefing Archive fetch failed:", error);
    }
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
      
      {/* Geography Input */}
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

      {/* Objective Input */}
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

      {/* The GO Button */}
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

      {/* --- HISTORY & TRAVELLED BUTTONS --- */}
      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        {/* NEW: Briefing Archive Button */}
        <button onClick={fetchBriefingArchive} className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-violet-500/50 rounded-lg text-violet-300 text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(139,92,246,0.1)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer">
          <span>🗂️</span> AI Briefing Archive
        </button>
        <button onClick={fetchHistory} className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer">
          <span>📜</span> Search History
        </button>
        <button className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer">
          <span>✈️</span> Countries Travelled
        </button>
      </div>

      {/* --- THEME SWITCHER TOGGLE --- */}
      <div className="mt-4 bg-slate-950 p-1.5 rounded-lg flex border border-slate-800 shadow-inner">
        <button 
          onClick={() => dispatch({ type: "SET_THEME", payload: "light" })}
          className={`flex-1 py-2 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'light' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          LIGHT
        </button>
        <button 
          onClick={() => dispatch({ type: "SET_THEME", payload: "dark" })}
          className={`flex-1 py-2 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'dark' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
        >
          DARK
        </button>
        <button 
          onClick={() => dispatch({ type: "SET_THEME", payload: "treasure" })}
          className={`flex-1 py-2 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${activeTheme === 'treasure' ? 'bg-[#1b5949] text-amber-100 shadow-md border border-[#dbb086a9]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          TREASURE
        </button>
      </div>

      {/* --- SEARCH HISTORY MODAL --- */}
      {showHistoryModal && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h3 className="text-[1.3rem] font-black text-blue-400 tracking-wide">Command History</h3>
            <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-red-500 text-xl font-bold transition-colors cursor-pointer">✖</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {history.length > 0 ? history.map((item, i) => (
              <div 
                key={i} 
                onClick={() => { triggerCountryFocus(item.country); setShowHistoryModal(false); }} 
                className="bg-slate-900 p-4 rounded-xl cursor-pointer hover:bg-blue-600/20 transition-all border border-slate-800 hover:border-blue-500 shadow-sm hover:shadow-md"
              >
                <div className="font-extrabold text-slate-100 text-[1.1rem] tracking-wide">{item.country}</div>
                <div className="text-[0.75rem] text-slate-400 mt-1.5 font-medium flex justify-between">
                  <span className="text-sky-400">Viewed</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-slate-500 italic text-center mt-12 text-sm font-semibold">No map interactions logged yet.</div>
            )}
          </div>
        </div>
      )}

      {/* --- NEW: BRIEFING ARCHIVE MODAL --- */}
      {showBriefingModal && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col p-6 shadow-2xl animate-[slideDownFade_0.3s_ease-out_forwards]">
          <div className="flex justify-between items-center mb-6 border-b border-violet-500/30 pb-4">
            <h3 className="text-[1.3rem] font-black text-violet-400 tracking-wide flex items-center gap-2">
              <span>🗂️</span> AI Archive
            </h3>
            <button onClick={() => setShowBriefingModal(false)} className="text-slate-500 hover:text-red-500 text-xl font-bold transition-colors cursor-pointer">✖</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {briefingHistory.length > 0 ? briefingHistory.map((item, i) => (
              <div 
                key={i} 
                onClick={() => { 
                  // Clicking an archive instantly loads the cached version via your existing fetchBriefing logic!
                  triggerCountryFocus(item.country); 
                  dispatch({ type: "SET_PURPOSE", payload: item.purpose });
                  fetchBriefing(item.country, item.purpose);
                  setShowBriefingModal(false); 
                }} 
                className="bg-slate-900 p-4 rounded-xl cursor-pointer hover:bg-violet-600/20 transition-all border border-slate-800 hover:border-violet-500 shadow-sm hover:shadow-md"
              >
                <div className="font-extrabold text-white text-[1.1rem] tracking-wide">{item.country}</div>
                <div className="text-[0.75rem] text-slate-400 mt-1.5 font-medium flex justify-between items-center">
                  <span className="text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">{item.purpose}</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-slate-500 italic text-center mt-12 text-sm font-semibold">No AI Briefings generated yet.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}