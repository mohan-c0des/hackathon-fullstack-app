import React, { useState, useMemo, useRef, useEffect } from "react";

const PURPOSE_PRESETS = [
  "Academic / Studying",
  "Travel / Tourism",
  "Family & Friends",
  "Business Operations"
];

export default function Sidebar({ state, dispatch, geoFeatures, triggerCountryFocus }) {
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showPurposeDrop, setShowPurposeDrop] = useState(false);
  
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

  return (
    <div className={`
      w-[360px] min-w-[360px] h-full
      bg-[#0f172a]/50 backdrop-blur-2xl border-r border-white/10 shadow-[4px_0_30px_rgba(0,0,0,0.3)] 
      flex flex-col p-8 z-20 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${state.isBriefingActive ? "-ml-[360px] border-r-transparent" : ""}
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
          <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 hover:bg-slate-800 transition-colors" onClick={() => setShowCountryDrop(!showCountryDrop)}>▾</button>
        </div>
        
        {showCountryDrop && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg max-h-[200px] overflow-y-auto z-50 shadow-xl">
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
          <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 hover:bg-slate-800 transition-colors" onClick={() => setShowPurposeDrop(!showPurposeDrop)}>▾</button>
        </div>

        {showPurposeDrop && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl">
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
          ${state.selectedCountry 
            ? "bg-gradient-to-br from-gray-200 to-gray-500 text-white cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:brightness-110 hover:-translate-y-[2px]" 
            : "bg-slate-700 text-slate-500 cursor-not-allowed"}
        `}
        onClick={() => dispatch({ type: "START_BRIEFING" })}
        disabled={!state.selectedCountry}
      >
        GO!
      </button>
    </div>
  );
}