import React, { useState, useRef, useEffect } from "react";

const PURPOSE_PRESETS = ["Academic / Studying", "Travel / Tourism", "Family & Friends", "Business Operations"];
const INDIC_LANGUAGES = [
  { code: "en-IN", label: "English (Default)", hasAudio: false },
  { code: "hi-IN", label: "Hindi", hasAudio: true },
  { code: "te-IN", label: "Telugu", hasAudio: true },
  { code: "ta-IN", label: "Tamil", hasAudio: true },
  { code: "bn-IN", label: "Bengali", hasAudio: true },
  { code: "mr-IN", label: "Marathi", hasAudio: true }
];
const TABS = [
  { id: "briefing", label: "AI Briefing" }, { id: "rules", label: "Rules" },
  { id: "present news", label: "Present News" }, { id: "neighbors", label: "Similar Countries" },
  { id: "culture", label: "Culture & Language" }, { id: "currency", label: "Currency" },
  { id: "places", label: "Popular Places" }, { id: "economy", label: "Economy" },
  { id: "political", label: "Political Status" }, { id: "allies", label: "Friends & Enemies" },
  { id: "history", label: "History" }, { id: "population", label: "Geography & Population" },
  { id: "transport", label: "Transport" },{ id: "public safty level", label: "Public safty level"},
  { id: "health", label: "Health" }, { id: "visa", label: "Visa & Entry" }
];

// Custom Lightweight Markdown Parser
const renderMarkdownBeautifully = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} className="text-[1.3rem] font-bold text-violet-300 mt-8 mb-3">{line.replace('### ', '')}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-[1.6rem] font-extrabold text-white mt-10 mb-4 border-b border-slate-700 pb-2">{line.replace('## ', '')}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} className="text-[2rem] font-black text-sky-400 mt-10 mb-6">{line.replace('# ', '')}</h1>;
    
    const parseBold = (str) => {
      return str.split(/(\*\*.*?\*\*)/g).map((part, j) => 
        part.startsWith('**') && part.endsWith('**') 
          ? <strong key={j} className="text-white font-bold tracking-wide">{part.slice(2, -2)}</strong> 
          : part
      );
    };

    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const content = line.trim().substring(2);
      return <li key={i} className="ml-6 list-disc mb-3 text-slate-300 pl-2 marker:text-violet-500">{parseBold(content)}</li>;
    }
    
    if (!line.trim()) return <div key={i} className="h-3"></div>;

    return <p key={i} className="mb-4 text-slate-300 leading-[1.8] text-[1.05rem]">{parseBold(line)}</p>;
  });
};

export default function CanvasOverlay({ state, dispatch, fetchBriefing, fetchTab, sendDoubt, handleCloseCanvas }) {
  const [showCanvasDrop, setShowCanvasDrop] = useState(false);
  const canvasPurposeRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [translatedContent, setTranslatedContent] = useState(null); 

  useEffect(() => {
    setSelectedLang("en-IN");
    setTranslatedContent(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [state.activeTab, state.briefingData, state.tabContent]);

  const activeContent = state.activeTab === "briefing" 
    ? state.briefingData 
    : state.tabContent[state.activeTab];

  const displayContent = translatedContent || activeContent;

  const handleTranslate = async (langCode) => {
    setSelectedLang(langCode);
    if (langCode === "en-IN") {
      setTranslatedContent(null); 
      return; 
    }
    
    setIsTranslating(true);
    
    try {
      const headers = { "Content-Type": "application/json" };
      if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/translate` , {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ text: activeContent, target_lang: langCode })
      });
      const result = await response.json();
      
      setTranslatedContent(result.data);
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleListen = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; 
      }
      setIsPlaying(false);
      return; 
    }

    setIsPlaying(true);
    
    try {
      const headers = { "Content-Type": "application/json" };
      if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/audio`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ text: displayContent, target_lang: selectedLang })
      });
      const result = await response.json();
      
      if (result.audio_base64) {
        audioRef.current = new Audio(`data:audio/wav;base64,${result.audio_base64}`);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => setIsPlaying(false);
        audioRef.current.play();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.doubtsHistory, displayContent]); 

  useEffect(() => {
    const handleClick = (e) => {
      if (canvasPurposeRef.current && !canvasPurposeRef.current.contains(e.target)) setShowCanvasDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTabClick = (tabId) => {
    dispatch({ type: "SET_TAB", payload: tabId });
    fetchTab(tabId);
  };

  return (
    <div className={`
      flex flex-col min-h-0 bg-[#0f172a] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-20
      transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${state.isBriefingActive 
        ? "flex-1 opacity-100 translate-y-0 border-t-2 border-violet-500" 
        : "h-0 flex-none opacity-0 translate-y-20 overflow-hidden border-t-0 border-r-transparent"}
    `}>
      
      <style>{`
        @keyframes slideDownFade {
          0% { opacity: 0; transform: translateY(-15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal {
          animation: slideDownFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #090d16; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {/* --- FLOATING START JOURNEY BUTTON --- */}
      <div className="absolute -top-[28px] left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => dispatch({ type: "START_JOURNEY" })}
          className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 px-8 py-3 rounded-t-xl font-black tracking-widest uppercase text-sm shadow-[0_-10px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_-10px_30px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all flex items-center gap-2 border-t-2 border-emerald-300 cursor-pointer"
        >
          Start Journey
        </button>
      </div>

      {/* Header Bar & Tabs */}
      <div className="flex-none flex justify-between bg-slate-800 border-b border-slate-700 py-2 pt-4">
        <div className="flex overflow-x-auto flex-1 px-4 items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab, idx) => (
            <button 
              key={tab.id} 
              data-active={state.activeTab === tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                shrink-0 relative px-5 py-2 border text-[0.9rem] rounded-[12px] mr-[0.6rem] whitespace-nowrap 
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
            title="Terminate AI and Close"
            onClick={handleCloseCanvas} 
          >
            ✖
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-h-0 p-6 relative">
        
        <div className="flex-none flex items-center gap-4 mb-6 relative" ref={canvasPurposeRef}>
          <label className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sky-400 font-bold">{state.selectedCountry}</label>
          <div className="flex flex-1 max-w-[350px]">
            <input 
              type="text" className="flex-1 p-3 bg-slate-900/60 border border-slate-700 border-r-0 rounded-l-lg text-slate-50 outline-none focus:border-violet-500" 
              placeholder="Update purpose..." value={state.purposeInput} onChange={(e) => dispatch({ type: "SET_PURPOSE", payload: e.target.value })} 
            />
            <button className="px-3 bg-slate-900/60 border border-slate-700 rounded-r-lg text-slate-500 hover:text-violet-500 cursor-pointer" onClick={() => setShowCanvasDrop(!showCanvasDrop)}>▾</button>
          </div>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-[30px] text-[1.1rem] font-semibold transition-colors shadow-md cursor-pointer disabled:opacity-50" 
            onClick={() => fetchBriefing(state.selectedCountry, state.purposeInput)}
            disabled={state.isLoading}
          >
            {state.isLoading && state.activeTab === 'briefing' ? "Loading..." : "Confirm"}
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

        <div className="flex-1 overflow-y-auto bg-[#090d16] border border-slate-800 rounded-lg p-8 shadow-inner custom-scrollbar relative">
          
          {state.isLoading && !activeContent && !state.doubtsHistory.length ? (
            <div className="flex items-center justify-center h-full text-violet-400 animate-pulse font-semibold text-lg tracking-widest">
              [ CONNECTING TO INTELLIGENCE CORE... ]
            </div>
          ) : (
            <div className="max-w-5xl mx-auto w-full animate-reveal" key={state.activeTab}>
              
              {/* --- SARVAM AI CONTROL BAR --- */}
              {activeContent && !state.isLoading && (
                <div className="flex justify-end items-center gap-4 mb-4 border-b border-slate-800 pb-3">
                  
                  <div className="relative">
                    <select 
                      className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 py-1.5 pl-4 pr-8 rounded-lg outline-none focus:border-violet-500 cursor-pointer text-sm font-semibold shadow-sm transition-colors hover:bg-slate-700"
                      value={selectedLang}
                      onChange={(e) => handleTranslate(e.target.value)}
                      disabled={isTranslating}
                    >
                      {INDIC_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>

                  <button 
                    onClick={handleListen}
                    disabled={selectedLang === "en-IN" || !INDIC_LANGUAGES.find(l => l.code === selectedLang)?.hasAudio || (isTranslating && !isPlaying)}
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md
                      ${selectedLang !== "en-IN" && INDIC_LANGUAGES.find(l => l.code === selectedLang)?.hasAudio
                        ? "bg-violet-600 hover:bg-violet-500 hover:scale-110 hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] text-white cursor-pointer" 
                        : "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-50"}
                      ${isPlaying ? "animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)] !bg-red-500" : ""}
                    `}
                    title={isPlaying ? "Stop Audio" : "Listen to Briefing"}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                        <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    )}
                  </button>

                  {isTranslating && <span className="text-violet-400 text-sm animate-pulse ml-2 font-semibold tracking-wide">Translating Data...</span>}
                  
                </div>
              )}

              {displayContent && (
                <div className={`mb-10 transition-opacity duration-300 ${isTranslating ? "opacity-30" : "opacity-100"}`}>
                  {renderMarkdownBeautifully(displayContent)}
                </div>
              )}
              
              {state.doubtsHistory.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-800/80">
                  {state.doubtsHistory.map((msg, idx) => (
                    <div key={idx} className={`mb-6 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[80%] p-5 rounded-2xl text-[1.05rem] leading-[1.7] shadow-md
                        ${msg.sender === 'user' 
                          ? 'bg-violet-600/20 border border-violet-500/30 text-violet-100 rounded-tr-sm' 
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'}
                      `}>
                        {msg.sender === 'ai' ? renderMarkdownBeautifully(msg.text) : msg.text}
                      </div>
                    </div>
                  ))}
                  {state.isLoading && state.doubtsHistory[state.doubtsHistory.length - 1]?.sender === 'user' && (
                    <div className="text-slate-500 text-sm italic mb-6 animate-pulse">Agent is analyzing live data...</div>
                  )}
                  <div ref={chatEndRef} className="h-4"></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-10 right-10 z-30 flex items-center justify-end h-[50px]">
          <button 
            className={`
              bg-violet-500 hover:bg-violet-400 text-white rounded-[30px] font-bold text-[1.1rem] 
              shadow-[0_4px_15px_rgba(139,92,246,0.5)] cursor-pointer transition-all duration-300
              ${state.showDoubtsInput ? 'w-0 h-0 opacity-0 overflow-hidden p-0' : 'px-6 py-3 hover:-translate-y-1 w-auto h-auto opacity-100'}
            `}
            onClick={() => dispatch({ type: "TOGGLE_DOUBTS", payload: true })}
          >
            Doubts?
          </button>

          <div className={`
            flex gap-2 bg-slate-800 rounded-[30px] border border-violet-500 shadow-[0_10px_25px_rgba(0,0,0,0.6)] items-center
            transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden
            ${state.showDoubtsInput ? 'w-[450px] p-2 opacity-100' : 'w-0 p-0 opacity-0 border-none'}
          `}>
            <input 
              type="text" placeholder="Ask AI a specific doubt..." 
              autoFocus={state.showDoubtsInput}
              className="bg-transparent border-none text-white px-4 outline-none flex-1 min-w-0"
              value={state.doubtsText} 
              onChange={(e) => dispatch({ type: "SET_DOUBTS_TEXT", payload: e.target.value })} 
              onKeyDown={(e) => e.key === 'Enter' && sendDoubt(state.doubtsText)}
            />
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-1.5 rounded-[20px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex-none"
              onClick={() => sendDoubt(state.doubtsText)}
              disabled={state.isLoading}
            >
              Send
            </button>
            <button 
              className="text-slate-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded-full text-[1.2rem] transition-all duration-300 cursor-pointer flex-none" 
              onClick={() => dispatch({ type: "TOGGLE_DOUBTS", payload: false })}
            >
              ✖
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}