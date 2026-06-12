import React, { useState, useRef, useEffect } from "react";

const PURPOSE_PRESETS = ["Academic / Studying", "Travel / Tourism", "Family & Friends", "Business Operations"];

const TABS = [
  { id: "briefing", label: "AI Briefing" }, { id: "rules", label: "Rules" },
  { id: "culture", label: "Culture & Language" }, { id: "currency", label: "Currency" },
  { id: "places", label: "Popular Places" }, { id: "economy", label: "Economy" },
  { id: "political", label: "Political Status" }, { id: "allies", label: "Friends & Enemies" },
  { id: "history", label: "History" }, { id: "population", label: "Geography & Population" },
  { id: "transport", label: "Transport" }, { id: "safety", label: "Safety" },
  { id: "health", label: "Health" }, { id: "visa", label: "Visa & Entry" }
];

export default function CanvasOverlay({ state, dispatch }) {
  const [showCanvasDrop, setShowCanvasDrop] = useState(false);
  const canvasPurposeRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (canvasPurposeRef.current && !canvasPurposeRef.current.contains(e.target)) setShowCanvasDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const submitBackendRequest = () => {
    console.log(`🚀 FastAPI Request -> Country: ${state.selectedCountry}, Purpose: ${state.purposeInput}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f172a] border-t-2 border-violet-500 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-20">
      
      <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 z-30">
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white border-2 border-emerald-900 py-1.5 px-6 rounded-full font-extrabold tracking-wide shadow-md transition-transform hover:-translate-y-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
          START
        </button>
      </div>

      {/* Header Bar & Tabs */}
      <div className="flex justify-between bg-slate-800 border-b border-slate-700 py-2">
        {/* The Parent Container (Needs overflow-x-auto and hidden scrollbars) */}
      <div className="flex overflow-x-auto flex-1 px-4 items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {TABS.map((tab, idx) => (
          <button 
            key={tab.id} 
            data-active={state.activeTab === tab.id}
            onClick={() => dispatch({ type: "SET_TAB", payload: tab.id })}
            className={`
              shrink-0
              relative px-5 py-2 border text-[0.9rem] rounded-[12px] mr-[0.6rem] whitespace-nowrap 
              transition-all font-semibold cursor-pointer
              border-slate-600 text-slate-200 bg-slate-900/40 shadow-md
              hover:shadow-lg hover:border-violet-400 hover:text-violet-300 hover:bg-slate-800/60
              active:scale-[0.97] active:shadow-sm
              data-[active=true]:border-violet-500 data-[active=true]:text-violet-400 data-[active=true]:bg-slate-800/70 data-[active=true]:shadow-lg
              after:content-[''] after:absolute after:left-1/2 after:bottom-0 after:h-[2px] after:w-0 after:bg-violet-400 
              after:transition-all after:duration-300 after:-translate-x-1/2 hover:after:w-full
              data-[active=true]:after:w-full
              ${idx === 0 ? "mr-[2.5rem]" : ""}
            `}
          >
            {tab.label}
          </button>

        ))}
        
      </div>
        
        {/* Window Controls */}
        <div className="flex items-center px-4 gap-3">
          <button 
            className="text-slate-400 hover:bg-violet-500 hover:text-white px-2 py-1 rounded-md text-[1.2rem] transition-all duration-300 cursor-pointer" 
            title={state.isCanvasExpanded ? "Restore Down" : "Maximize"}
            onClick={() => dispatch({ type: "TOGGLE_EXPAND" })}
          >
            {state.isCanvasExpanded ? "🗗" : "🗖"}
          </button>
          <button 
            className="text-slate-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded-md text-[1.2rem] transition-all duration-300 cursor-pointer" 
            title="Close Briefing Canvas"
            onClick={() => dispatch({ type: "CLOSE_CANVAS" })}
          >
            ✖
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col relative border-radius-lg">
        
        {/* Purpose Row */}
        <div className="flex items-center gap-4 mb-6 relative" ref={canvasPurposeRef}>
          <label className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sky-400 font-bold">{state.selectedCountry}</label>
          <div className="flex flex-1 max-w-[350px]">
            <input 
              type="text" className="flex-1 p-3 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 outline-none focus:border-violet-500" 
              placeholder="Update purpose..." value={state.purposeInput} onChange={(e) => dispatch({ type: "SET_PURPOSE", payload: e.target.value })} 
            />
            <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 cursor-pointer" onClick={() => setShowCanvasDrop(!showCanvasDrop)}>▾</button>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-[30px] text-[1.1rem] font-semibold transition-colors shadow-md cursor-pointer" onClick={submitBackendRequest}>
            Confirm
          </button>

          {showCanvasDrop && (
            <div className="absolute top-full left-[100px] w-[350px] mt-1 bg-[#0f172a] border border-slate-700 rounded-lg z-50 shadow-xl overflow-hidden">
              {PURPOSE_PRESETS.map(preset => (
                <div key={preset} className="p-3 text-[0.9rem] text-slate-400 cursor-pointer hover:bg-violet-500 hover:text-white transition-colors" onClick={() => { dispatch({ type: "SET_PURPOSE", payload: preset }); setShowCanvasDrop(false); }}>
                  {preset}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backend Stream Box */}
        <div className="flex-1 bg-[#090d16] border border-slate-800 rounded-lg p-6 text-slate-300 shadow-inner">
          <h2 className="text-[1.5rem] font-bold text-slate-50">{TABS.find(t => t.id === state.activeTab)?.label} Data</h2>
          <hr className="border-t border-slate-800 my-4" />
          <p className="text-slate-400 leading-relaxed">
            This space is ready for FastAPI injection. When you click "Start" or submit the arrow, the backend 
            will stream data regarding <strong className="text-slate-200">{state.selectedCountry}</strong> optimized for: <strong className="text-slate-200">{state.purposeInput || "General Outline"}</strong>.
          </p>
        </div>

        {/* Doubts Bubble */}
        <div className="absolute bottom-5 right-5 z-30">
          {state.showDoubtsInput ? (
            <div className="flex gap-2 bg-slate-800 p-2 rounded-[30px] border border-violet-500 shadow-[0_10px_25px_rgba(0,0,0,0.6)] items-center">
              <input 
                type="text" placeholder="Ask AI a specific doubt..." autoFocus
                className="bg-transparent border-none text-white px-4 outline-none w-[250px]"
                value={state.doubtsText} onChange={(e) => dispatch({ type: "SET_DOUBTS_TEXT", payload: e.target.value })} 
              />
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-[20px] font-semibold transition-colors cursor-pointer">Send</button>
              <button className="text-slate-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded-full text-[1.2rem] transition-all duration-300 cursor-pointer" onClick={() => dispatch({ type: "TOGGLE_DOUBTS", payload: false })}>✖</button>
            </div>
          ) : (
            <button 
              className="bg-violet-500 hover:bg-violet-400 text-white px-5 py-3 rounded-[30px] font-bold text-[1rem] shadow-[0_4px_15px_rgba(139,92,246,0.5)] cursor-pointer transition-all hover:-translate-y-1"
              onClick={() => dispatch({ type: "TOGGLE_DOUBTS", payload: true })}
            >
              Doubts?
            </button>
          )}
        </div>

      </div>
    </div>
  );
}