import React, { useState, useEffect, useRef } from "react";

// Custom Lightweight Markdown Parser with Type Safety
const renderMarkdownBeautifully = (text) => {
  if (!text) return null;
  if (typeof text !== 'string') text = String(text);

  return text.split('\n').map((line, i) => {
    // SMALLER HEADINGS
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-emerald-300 mt-6 mb-2">{line.replace('### ', '')}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-extrabold text-white mt-8 mb-3 border-b border-slate-700 pb-2">{line.replace('## ', '')}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-emerald-400 mt-8 mb-4">{line.replace('# ', '')}</h1>;
    
    const parseBold = (str) => {
      return str.split(/(\*\*.*?\*\*)/g).map((part, j) => 
        part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-white font-bold tracking-wide">{part.slice(2, -2)}</strong> : part
      );
    };

    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      // LARGER BULLET POINTS
      const content = line.trim().substring(2);
      return <li key={i} className="ml-6 list-disc mb-3 text-slate-200 text-xl pl-2 marker:text-emerald-500">{parseBold(content)}</li>;
    }
    if (!line.trim()) return <div key={i} className="h-2"></div>;
    // LARGER BODY TEXT
    return <p key={i} className="mb-4 text-slate-200 leading-[1.8] text-xl">{parseBold(line)}</p>;
  });
};

export default function JourneyPage({ state, dispatch }) {
  // --- View Phases ---
  const [viewPhase, setViewPhase] = useState("intro"); 
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isAnnoyed, setIsAnnoyed] = useState(false);

  // --- Journey Data & Progression ---
  const [journeyPlan, setJourneyPlan] = useState(null);
  const [currentGlobalStep, setCurrentGlobalStep] = useState(0);
  const [rogerChecked, setRogerChecked] = useState(false);
  const [showFullPlanModal, setShowFullPlanModal] = useState(false);
  const [missionStarted, setMissionStarted] = useState(false);

  /// --- Sarvam State ---
  const [targetLanguage, setTargetLanguage] = useState("en-IN");
  const [translatedSteps, setTranslatedSteps] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const [missionError, setMissionError] = useState(null);
  
  // --- NEW: Phase Transition State ---
  const [phaseTransition, setPhaseTransition] = useState({ active: false, completedPhase: "", nextPhase: "" });

  // --- Phase Boundary Logic ---
  const handleNextStep = () => {
    const nextStep = currentGlobalStep + 1;
    setRogerChecked(false);

    const isEndPre = nextStep === preNames.length;
    const isEndTrans = nextStep === preNames.length + transNames.length;
    const isEndFinal = nextStep === totalSteps;

    if (isEndPre) {
      setPhaseTransition({ active: true, completedPhase: "Pre-Travel", nextPhase: "Transit" });
      setViewPhase("phase_transition_roam");
    } else if (isEndTrans) {
      setPhaseTransition({ active: true, completedPhase: "Transit", nextPhase: "Post-Travel" });
      setViewPhase("phase_transition_roam");
    } else if (isEndFinal) {
      // NEW: Trigger Farewell roaming
      setPhaseTransition({ active: true, completedPhase: "the Entire Journey", nextPhase: "Archive" });
      setViewPhase("farewell_roam");
    } else {
      setCurrentGlobalStep(nextStep); // Normal step forward
    }
  };

  const handlePhaseReady = () => {
    // If it's the final farewell, skip rewrite and jump straight to the accomplished screen
    if (phaseTransition.nextPhase === "Archive") {
      setCurrentGlobalStep(prev => prev + 1);
      setViewPhase("dashboard");
      setPhaseTransition({ active: false, completedPhase: "", nextPhase: "" });
      return;
    }

    // 1. Boomer flies to the sidebar to "rewrite" it
    setViewPhase("phase_transition_rewrite");
    
    // 2. Wait 3s (Increased time!) for him to arrive and wipe it, then update data
    setTimeout(() => {
      setCurrentGlobalStep(prev => prev + 1);
      setViewPhase("dashboard");
      setPhaseTransition({ active: false, completedPhase: "", nextPhase: "" });
    }, 3000); 
  };

  // --- Chat / Doubts State ---
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Add-ons state for radio pill selections
  const [addonsObj, setAddonsObj] = useState({ companions: "Solo", pace: "Balanced" });

  // Check if we are bypassing AI for an archived journey!
  const isRestoring = !!state?.restoredJourneyData;

  // Form State
  const [formData, setFormData] = useState({
    name: "", gender: "Male", role: "", age: "",
    country: "", origin_city: "", nationality: "", citizenship: "", bio: "",
    health_condition: "", passport_expiry: "", passport_blank_pages: "",
    target_country: state?.selectedCountry || "",
    purpose: state?.purposeInput || "",
    exact_destination: "", travel_duration: "", add_ons: "", extra_info: "",
    session_id: ""
  });

  const hasFetchedProfile = useRef(false);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Fetch User Profile (Prevent double-fetch bug)
  useEffect(() => {
    if (!state?.token || hasFetchedProfile.current) {
      setIsLoadingProfile(false);
      return; 
    }
    
    hasFetchedProfile.current = true;

    const fetchProfile = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: { "Authorization": `Bearer ${state.token}` }
        });
        if (response.ok) {
          const json = await response.json();
          const p = json.data;
          setFormData(prev => ({
            ...prev,
            name: p.name || "", role: p.role || "", age: p.age || "",
            country: p.country || "", origin_city: p.origin_city || "",
            nationality: p.nationality || "", citizenship: p.citizenship || "",
            bio: p.bio || "", health_condition: p.health_condition || "None",
            passport_expiry: p.passport_expiry || "",
            passport_blank_pages: p.passport_blank_pages || ""
          }));
        }
      } catch (error) {
        console.error("Failed to load profile for journey", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [state?.token]);

  // Intro to Form Transition
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewPhase === "intro") setViewPhase("form");
    }, 2500);
    return () => clearTimeout(timer);
  }, [viewPhase]);

  // Sync Poke Animation
  useEffect(() => {
    let interval;
    let sleepTimeout;
    
    if (viewPhase === "waking") {
      setIsAnnoyed(true);
      sleepTimeout = setTimeout(() => setIsAnnoyed(false), 1500);

      interval = setInterval(() => {
        setIsAnnoyed(true);
        sleepTimeout = setTimeout(() => setIsAnnoyed(false), 1500);
      }, 4000);
    } else {
      setIsAnnoyed(false);
    }
    
    return () => {
      clearInterval(interval);
      clearTimeout(sleepTimeout);
    };
  }, [viewPhase]);

  // --- API INTEGRATION: Wake Boomer ---
  const handleWakeBoomer = async (e) => {
    e.preventDefault();
    
    const sessId = "sess_" + Math.random().toString(36).substring(7);
    const finalAddons = `Companions: ${addonsObj.companions}, Pace: ${addonsObj.pace}`;
    const updatedFormData = { ...formData, add_ons: finalAddons, session_id: sessId };
    setFormData(updatedFormData);

    setViewPhase("waking");
    const startTime = Date.now();

    // TRAVEL AGAIN BYPASS: Skips Backend Completely!
    if (isRestoring) {
      setTimeout(() => {
        setJourneyPlan(state.restoredJourneyData);
        
        // ADD THIS LINE HERE: This tells the dashboard to skip the "Start Mission" button and jump straight into the archived text.
        setMissionStarted(true); 
        
        setViewPhase("roaming");
        setTimeout(() => {
          setViewPhase("introducing");
          setTimeout(() => { setViewPhase("dashboard"); }, 4000);
        }, 3000);
      }, 8000); // 8-second emulation of waking up
      return;
    }

    try {
      setMissionError(null); // Clear previous errors

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      
      // Ensure the token is passed if logged in!
      const headers = { "Content-Type": "application/json" };
      if (state.token) {
        headers["Authorization"] = `Bearer ${state.token}`;
      }

      const res = await fetch(`${API_URL}/api/journey/interact`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(updatedFormData)
      });
      
      // --- INTERCEPT BACKEND ERROR MESSAGES ---
      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}`;
        try {
          const errData = await res.json();
          // Look for FastAPI's "detail", your custom "error", or stringify the object
          errorMsg = errData.detail || errData.error || JSON.stringify(errData);
        } catch {
          errorMsg = await res.text();
        }
        throw new Error(errorMsg); // Pass the exact backend error to the catch block!
      }
      
      const data = await res.json();
      
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 8000 - elapsed);

      setTimeout(() => {
        setJourneyPlan(data);
        setViewPhase("roaming");
        
        setTimeout(() => {
          setViewPhase("introducing");
          setTimeout(() => {
            setViewPhase("dashboard");
          }, 4000);
        }, 3000);
      }, remainingTime);

    } catch (err) {
      console.error(err);
      // Remove the annoying alert() and use our new state instead!
      setMissionError(err.message || "Failed to connect to Boomer's intelligence core.");
      setViewPhase("form"); 
    }
  };

  // --- API INTEGRATION: Send Doubt ---
  const handleSendDoubt = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { sender: "user", text: userMsg }]);
    setIsChatLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/journey/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: formData.session_id,
          question: userMsg,
          current_step: allNames[currentGlobalStep] || "General"
        })
      });
      
      const data = await res.json();
      
      // DEEP PARSING: Handles raw strings, nested arrays, and objects from LangChain!
      let answerText = "I encountered a glitch processing that.";
      let rawAnswer = data.answer || data;
      
      // If it's a string, see if it's secretly a JSON array
      if (typeof rawAnswer === 'string') {
        try {
          const parsed = JSON.parse(rawAnswer);
          rawAnswer = parsed;
        } catch (e) {
           answerText = rawAnswer; // It's just a normal string
        }
      }

      // Dig out the text based on structure
      if (Array.isArray(rawAnswer) && rawAnswer.length > 0 && rawAnswer[0].text) {
        answerText = rawAnswer[0].text;
      } else if (typeof rawAnswer === 'object' && rawAnswer !== null && rawAnswer.text) {
        answerText = rawAnswer.text;
      } else if (typeof rawAnswer === 'string') {
        answerText = rawAnswer;
      } else {
        answerText = JSON.stringify(rawAnswer);
      }

      setChatHistory(prev => [...prev, { sender: "ai", text: answerText, requiresAction: true }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: "ai", text: "I lost connection to the intelligence core! Try again.", requiresAction: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- API INTEGRATION: Save and Close ---
  const handleSaveAndClose = async () => {
    // Only attempt to save if the user is logged in (has a token)
    if (state.token) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        await fetch(`${API_URL}/api/journey/save`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${state.token}`
          },
          body: JSON.stringify({
            session_id: formData.session_id,
            target_country: formData.target_country,
            purpose: formData.purpose,
            journey_plan: journeyPlan,
            chat_history: chatHistory
          })
        });
      } catch (e) {
        console.error("Failed to save journey data", e);
      }
    }
    // Regardless of guest or user, close the journey page
    dispatch({ type: "CLOSE_JOURNEY" });
  };

  // --- DATA DERIVATION FOR DASHBOARD ---
  const preNames = journeyPlan?.step_names?.pre_travel_steps || [];
  const transNames = journeyPlan?.step_names?.transit_steps || [];
  const postNames = journeyPlan?.step_names?.post_travel_steps || [];
  const allNames = [...preNames, ...transNames, ...postNames];

  const preData = journeyPlan?.step_data?.pre_travel_step_data || [];
  const transData = journeyPlan?.step_data?.transit_step_data || [];
  const postData = journeyPlan?.step_data?.post_travel_step_data || [];
  const allData = [...preData, ...transData, ...postData];

  const totalSteps = allNames.length || 1;
  const progressPercent = Math.min(100, Math.max(0, (currentGlobalStep / totalSteps) * 100));

  // Determine Current Phase Logic
  let currentPhaseName = "Pre-Travel";
  let activePhaseNames = preNames;

  if (currentGlobalStep >= preNames.length + transNames.length) {
    currentPhaseName = "Post-Travel";
    activePhaseNames = postNames;
  } else if (currentGlobalStep >= preNames.length) {
    currentPhaseName = "Transit";
    activePhaseNames = transNames;
  }

  // Determine Dynamic Emoji for the Track!
  let thumbEmoji = "📝";
  if (currentPhaseName === "Post-Travel") thumbEmoji = "📍";
  else if (currentPhaseName === "Transit") {
    const stepText = (allNames[currentGlobalStep] || "").toLowerCase();
    if (stepText.includes("flight") || stepText.includes("fly") || stepText.includes("air") || stepText.includes("airport")) {
      thumbEmoji = "✈️";
    } else {
      thumbEmoji = "🚗";
    }
  }

  const handleTranslateStep = async () => {
    if (translatedSteps[currentGlobalStep]) {
      setTranslatedSteps(prev => {
         const next = {...prev};
         delete next[currentGlobalStep];
         return next;
      });
      return;
    }
    
    setIsTranslating(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const textToTranslate = `${allNames[currentGlobalStep]}\n\n${allData[currentGlobalStep]}`;
      
      const res = await fetch(`${API_URL}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToTranslate,
          target_lang: targetLanguage // <-- Fixed: Changed from target_language_code to match your backend schema
        })
      });
      const data = await res.json();
      
      setTranslatedSteps(prev => ({
        ...prev,
        [currentGlobalStep]: data.data // <-- Fixed: Reads data.data instead of data.translated_text to match your backend return
      }));
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePlayAudio = async () => {
    setIsAudioLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      // Speak translated text if available, otherwise speak English
      const textToSpeak = translatedSteps[currentGlobalStep] || allData[currentGlobalStep];
      // Strip markdown so the AI doesn't read asterisks out loud
      const cleanText = textToSpeak.replace(/[*#]/g, '');
      
      const res = await fetch(`${API_URL}/api/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          target_lang: translatedSteps[currentGlobalStep] ? targetLanguage : "en-IN" 
        })
      });
      
      const data = await res.json();
      if (data.audio_base64) { 
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.play();
      }
    } catch (error) {
      console.error("Audio failed", error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const renderBoomer = () => {
    const isAwake = ["roaming", "introducing", "dashboard", "chat", "phase_transition_roam", "phase_transition_rewrite", "farewell_roam"].includes(viewPhase);
    const mainStroke = isAnnoyed ? "#f87171" : "#34d399";
    const screenBg = "#020617";
    const bodyBg = "#0f172a";
    const accentBg = "#1e293b";
    const rotationClass = (viewPhase === "intro" || isAwake) ? "rotate-0" : "rotate-90";

    return (
      <div className="relative flex items-center justify-center w-full h-full">
        {!isAwake && !isAnnoyed && (
          <>
            <div className="absolute top-[10%] right-[10%] text-emerald-400 font-black animate-zzz1 opacity-0 text-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10">Z</div>
            <div className="absolute top-[-5%] right-[0%] text-emerald-300 font-black animate-zzz2 opacity-0 text-2xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10">Z</div>
            <div className="absolute top-[-20%] right-[-10%] text-emerald-200 font-black animate-zzz3 opacity-0 text-4xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10">Z</div>
          </>
        )}

        {viewPhase === "waking" && (
          <div>
          <div>
          <svg className="absolute right-[0%] top-[-20%] w-24 h-24 animate-poke z-[80] drop-shadow-[0_0_15px_rgba(252,165,165,0.4)]" viewBox="0 0 24 24" fill="#fca5a5" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 10a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h.5a1.5 1.5 0 0 1 1.5 1.5v4.5a3 3 0 0 1-3 3H9a4 4 0 0 1-4-4v-5a2 2 0 0 1 2-2h2V10z"/>
            <path d="M13 10V4a2 2 0 0 1 4 0v6"/>
          </svg>
          </div>
          <div>
          <p className="text-red-500 font-semibold">
            Wait!
          </p>
          </div>
          </div>
        )}

        <div className={`w-full h-full flex items-center justify-center ${isAwake ? "animate-hover-fast" : "animate-breathe"}`}>
          <svg width="100%" height="100%" viewBox="0 0 200 200" className={`transition-transform duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] drop-shadow-[0_0_20px_rgba(16,185,129,0.2)] ${rotationClass}`}>
            <line x1="100" y1="35" x2="100" y2="10" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="100" cy="10" r="6" fill={mainStroke} className={isAwake ? "animate-ping" : "animate-pulse"} />
            <path d="M 130 150 Q 170 180 180 120" fill="none" stroke={accentBg} strokeWidth="12" strokeLinecap="round" className={isAwake ? "animate-wag origin-[130px_150px]" : ""} />
            <rect x="60" y="100" width="80" height="70" rx="35" fill={bodyBg} stroke={mainStroke} strokeWidth="4" transition="stroke 0.3s" />
            <rect x="65" y="150" width="25" height="30" rx="12" fill={accentBg} />
            <rect x="110" y="150" width="25" height="30" rx="12" fill={accentBg} />
            <g className={isAnnoyed ? "animate-refuse origin-[100px_70px]" : ""}>
              <polygon points="45,60 65,15 85,45" fill={accentBg} stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
              <polygon points="155,60 135,15 115,45" fill={accentBg} stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
              <rect x="40" y="35" width="120" height="85" rx="40" fill={bodyBg} stroke={mainStroke} strokeWidth="4" transition="stroke 0.3s" />
              <rect x="55" y="50" width="90" height="45" rx="15" fill={screenBg} stroke={accentBg} strokeWidth="2" />
              {isAwake ? (
                <>
                  <ellipse cx="75" cy="70" rx="8" ry="12" fill={mainStroke} />
                  <ellipse cx="125" cy="70" rx="8" ry="12" fill={mainStroke} />
                  <path d="M 90 85 Q 100 95 110 85" fill="none" stroke={mainStroke} strokeWidth="3" strokeLinecap="round" />
                </>
              ) : isAnnoyed ? (
                <>
                  <path d="M 65 70 L 85 75" fill="none" stroke={mainStroke} strokeWidth="5" strokeLinecap="round" />
                  <path d="M 135 70 L 115 75" fill="none" stroke={mainStroke} strokeWidth="5" strokeLinecap="round" />
                  <path d="M 95 88 Q 100 83 105 88" fill="none" stroke={mainStroke} strokeWidth="3" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M 65 75 Q 75 80 85 75" fill="none" stroke={mainStroke} strokeWidth="4" strokeLinecap="round" />
                  <path d="M 115 75 Q 125 80 135 75" fill="none" stroke={mainStroke} strokeWidth="4" strokeLinecap="round" />
                  <polygon points="97,85 103,85 100,88" fill={mainStroke} />
                </>
              )}
            </g>
          </svg>
        </div>

      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-[#020617] z-50 overflow-hidden font-sans flex items-center justify-end pr-4 md:pr-12 lg:pr-24">
      
      {/* FOCUS OVERLAYS */}
      <div className={`absolute inset-0 bg-slate-950/40 z-[40] transition-opacity duration-1000 pointer-events-none ${viewPhase === "waking" ? "opacity-100" : "opacity-0"}`} />
      
     <div className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[80] transition-opacity duration-700 ${viewPhase === "chat" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />

      <style>{`
        @keyframes popInCenter { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02) translateY(-2px); } }
        @keyframes hover-fast { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes zzz { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 0.8; } 100% { transform: translate(25px, -45px) scale(1.3); opacity: 0; } }
        @keyframes refuse { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } 75% { transform: rotate(-8deg); } }
        @keyframes poke { 0%, 100% { transform: translate(40px, -40px) rotate(45deg); opacity: 0; } 5% { transform: translate(40px, -40px) rotate(45deg); opacity: 1; } 12% { transform: translate(-10px, 10px) rotate(0deg); } 18% { transform: translate(15px, -10px) rotate(15deg); } 25% { transform: translate(-10px, 10px) rotate(0deg); } 32% { transform: translate(40px, -40px) rotate(45deg); opacity: 1; } 38%, 100% { opacity: 0; transform: translate(40px, -40px); } }
        @keyframes roam { 0% { top: 50%; left: 15%; transform: scale(1) translate(0, -50%); } 25% { top: 20%; left: 70%; transform: scale(1.3) rotate(10deg) translate(0, 0); } 50% { top: 70%; left: 30%; transform: scale(1.6) rotate(-10deg); } 75% { top: 30%; left: 50%; transform: scale(1.2) rotate(5deg); } 100% { top: 15%; left: 50%; transform: scale(1.4) translate(-50%, 0); } }
        @keyframes wag { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(15deg); } }
        
        .animate-breathe { animation: breathe 3s ease-in-out infinite; }
        .animate-hover-fast { animation: hover-fast 1.5s ease-in-out infinite; }
        .animate-zzz1 { animation: zzz 3s linear infinite; animation-delay: 0s; }
        .animate-zzz2 { animation: zzz 3s linear infinite; animation-delay: 1s; }
        .animate-zzz3 { animation: zzz 3s linear infinite; animation-delay: 2s; }
        .animate-refuse { animation: refuse 1.5s ease-in-out infinite; }
        .animate-poke { animation: poke 4s ease-in-out infinite; }
        .animate-roam { animation: roam 3s ease-in-out forwards; }
        .animate-wag { animation: wag 1.5s ease-in-out infinite; }
        
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>

      {/* Pill-Shaped Detailed Close Button */}
      <button 
        onClick={() => {
          if (window.confirm("Are you sure you want to abort Journey?")) {
            dispatch({ type: "CLOSE_JOURNEY" });
          }
        }}
        className="absolute top-6 right-8 group flex items-center gap-3 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 px-4 py-2 rounded-full cursor-pointer z-[100] transition-all duration-300 shadow-lg"
      >
        <span className="text-xl font-black">✖</span>
        <span className="text-sm font-bold w-0 overflow-hidden group-hover:w-auto group-hover:pl-1 transition-all whitespace-nowrap opacity-0 group-hover:opacity-100">
          Abort Journey
        </span>
      </button>

      {/* BOOMER CONTAINER */}
      <div 
        className={`absolute transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] z-[90] flex items-center
          ${viewPhase === "intro" ? "top-[30%] left-1/2 -translate-x-1/2 w-80 h-80"
            : viewPhase === "form" || viewPhase === "waking" ? "top-1/2 -translate-y-1/2 left-[5%] lg:left-[12%] w-72 h-72" 
            : viewPhase === "roaming" || viewPhase === "phase_transition_roam" || viewPhase === "farewell_roam" ? "w-48 h-48 animate-roam" 
            : viewPhase === "introducing" ? "top-[15%] left-1/2 -translate-x-1/2 w-64 h-64" 
            : viewPhase === "chat" ? "top-[20%] left-1/2 -translate-x-1/2 w-56 h-56" 
            : viewPhase === "phase_transition_rewrite" ? "top-[250px] left-16 w-36 h-36 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]" // Hovers over sidebar!
            : "top-8 left-8 w-[280px] h-[180px]" // DASHBOARD
          }
        `}
      >
        <div className="w-full h-full relative">
          <div className={`absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 transition-opacity duration-1000 delay-[1500ms] ${(viewPhase === "form") ? "opacity-100 block" : "opacity-0 hidden"}`}>
            <div className="relative bg-slate-800/90 border border-emerald-500/40 text-emerald-300 font-bold px-6 py-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.2)] whitespace-nowrap">
              <div className="absolute -bottom-[12px] left-1/2 -translate-x-1/2 border-t-[12px] border-t-slate-800/90 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent"></div>
              <span className="text-xl tracking-wide block text-center mb-1">Boomer is sleeping...</span>
              <span className="text-slate-400 font-medium text-sm block text-center">Provide mission details to wake him.</span>
            </div>
          </div>
          
          {renderBoomer()}
          
          {viewPhase === "introducing" && (
            <div className="absolute top-[105%] left-1/2 -translate-x-1/2 mt-4 bg-emerald-950/80 border border-emerald-400/50 backdrop-blur-xl text-white p-5 rounded-3xl rounded-tl-none shadow-[0_0_40px_rgba(16,185,129,0.3)] whitespace-nowrap animate-[slideDownFade_0.5s_ease-out_forwards]">
              <p className="font-black text-2xl tracking-wider mb-1 text-emerald-300">YAWN... I'm awake! 🐾</p>
              <p className="text-base text-slate-200 font-semibold mb-3">I am Boomer, your Travel Concierge.</p>
              <div className="w-full h-px bg-emerald-500/30 mb-3"></div>
              <p className="text-xs text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Processing mission parameters...</p>
            </div>
          )}
        </div>
      </div>

      {/* NEW STANDALONE: Phase Transition & Farewell Celebration Bubbles */}
      {/* Separated from Boomer so they appear in the center AFTER a 2-second delay! */}
      {(viewPhase === "phase_transition_roam" || viewPhase === "farewell_roam") && phaseTransition.active && (
        <div className="absolute inset-0 z-[95] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 border border-emerald-500/50 backdrop-blur-xl text-white px-10 py-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center opacity-0 animate-[popInCenter_0.5s_ease-out_2s_forwards] pointer-events-auto">
            <p className="font-black text-4xl tracking-wider mb-3 text-emerald-400">
              {viewPhase === "farewell_roam" ? "Mission Accomplished!" : "Wooo! 🎉"}
            </p>
            <p className="text-2xl text-slate-200 font-semibold mb-4">
              You just completed <span className="text-white font-black">{phaseTransition.completedPhase}</span>.
            </p>
            
            {viewPhase === "farewell_roam" ? (
              <p className="text-slate-400 mb-8 font-medium text-lg">Safe travels! Ready to wrap things up?</p>
            ) : (
              <p className="text-slate-400 mb-8 font-medium text-lg">Ready to jump into {phaseTransition.nextPhase}?</p>
            )}

            <button 
              onClick={handlePhaseReady} 
              className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-all cursor-pointer text-lg"
            >
              {viewPhase === "farewell_roam" ? "Finish Journey" : "Yes, Ready!"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PHASE A: THE INTRO / INITIALIZATION FORM   */}
      {/* ========================================== */}
      {(viewPhase === "intro" || viewPhase === "form" || viewPhase === "waking") && (
        <div 
          className={`w-full max-w-2xl lg:max-w-3xl max-h-[85vh] bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-1000 delay-[500ms] transform z-[50]
            ${viewPhase === "intro" ? "opacity-0 translate-y-10 pointer-events-none" : 
              viewPhase === "form" ? "opacity-100 translate-y-0 pointer-events-auto" : 
              viewPhase === "waking" ? "opacity-85 translate-y-0 pointer-events-none blur-[2px] brightness-75 grayscale-[20%]" : 
              "opacity-0 scale-95 pointer-events-none hidden"} 
          `}
        >
          <div className="p-8 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/40 rounded-t-3xl">
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">Journey Initialization</h2>
            {/* NEW: Mission Error Display */}
                {missionError && (
                  <div className="w-full bg-red-950/50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 shadow-lg animate-[slideDownFade_0.3s_ease-out_forwards]">
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-xl mt-0.5">⚠️</span>
                      <div>
                        <h4 className="text-red-400 font-black uppercase tracking-widest text-sm mb-1">Journey Aborted</h4>
                        <p className="text-red-200 text-sm font-medium whitespace-pre-wrap">{missionError}</p>
                      </div>
                    </div>
                  </div>
                )}
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              STEP 0: PARAMETERS
            </div>
          </div>

          <form onSubmit={handleWakeBoomer} className="flex-1 overflow-y-auto custom-scroll p-8">
            {isLoadingProfile ? (
              <div className="flex justify-center items-center py-20 text-emerald-500 animate-pulse font-bold tracking-widest">
                [ SECURING IDENTITY DATA... ]
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Dynamic Identity Data (Locked for Auth, Editable for Guests) */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>{state.token ? "🔒" : "👤"}</span> 
                    {state.token ? "Your Identity" : "Traveler Identity (Guest Mode)"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Full Name", key: "name", type: "text", req: true },
                      { label: "Age", key: "age", type: "number", req: true },
                      { label: "Role", key: "role", type: "text", req: false },
                      { label: "Current Country", key: "country", type: "text", req: true },
                      { label: "Origin City", key: "origin_city", type: "text", req: true },
                      { label: "Citizenship", key: "citizenship", type: "text", req: true },
                      { label: "Health Profile", key: "health_condition", type: "text", req: false },
                      // NEW PASSPORT FIELDS:
                      { label: "Passport Expiry Date", key: "passport_expiry", type: "date", req: false },
                      { label: "Passport Blank Pages", key: "passport_blank_pages", type: "number", req: false },
                    ].map((field, idx) => (
                      <div key={idx}>
                        <label className="text-[10px] uppercase text-emerald-500 font-bold ml-1 mb-1 flex justify-between">
                          <span>{field.label}</span>
                          {!state.token && field.req && <span className="text-emerald-500">*</span>}
                        </label>
                        
                        {state.token ? (
                          <div className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-400 font-semibold cursor-not-allowed text-sm truncate">
                            {formData[field.key] || "Not Provided"}
                          </div>
                        ) : (
                          <input 
                            type={field.type}
                            required={field.req}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            value={formData[field.key] || ""}
                            onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white outline-none focus:border-emerald-500 focus:bg-slate-800 transition-colors text-sm"
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* Gender Dropdown (Always Editable) */}
                    <div>
                      <label className="text-[10px] uppercase text-emerald-400 font-bold ml-1 mb-1 block">Gender (Required)</label>
                      <select 
                        value={formData.gender} 
                        onChange={e => setFormData({...formData, gender: e.target.value})} 
                        className="w-full bg-slate-800 border border-emerald-500/50 p-3 rounded-xl text-white outline-none focus:border-emerald-400 cursor-pointer text-sm shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-colors"
                      >
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Locked Target Data */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    Journey Target
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Target Country</label>
                      <div className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-400 font-semibold cursor-not-allowed text-sm">{formData.target_country || "Not Selected"}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Primary Purpose</label>
                      <div className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-400 font-semibold cursor-not-allowed text-sm">{formData.purpose || "Not Selected"}</div>
                    </div>
                  </div>
                </div>

                {/* Editable Journey Specifics (Disabled if restoring) */}
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-emerald-500/20 shadow-inner">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     Journey Specifics
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1 block">Exact Destination (City)</label>
                      <input disabled={isRestoring} type="text" required placeholder="e.g., Tokyo University, Shibuya" value={formData.exact_destination} onChange={e => setFormData({...formData, exact_destination: e.target.value})} className={`w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white outline-none focus:border-emerald-500 focus:bg-slate-800 transition-colors text-sm ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1 block">Travel Duration</label>
                      <input disabled={isRestoring} type="text" required placeholder="e.g., 2 weeks, 6 months" value={formData.travel_duration} onChange={e => setFormData({...formData, travel_duration: e.target.value})} className={`w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white outline-none focus:border-emerald-500 focus:bg-slate-800 transition-colors text-sm ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                  </div>

                  <div className="mb-5 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] uppercase text-emerald-400 font-bold ml-1 mb-3 block">Travel Companions</label>
                        <div className="flex flex-wrap gap-2">
                          {["Solo", "Couple", "Family", "Friends"].map(opt => (
                            <button disabled={isRestoring} key={opt} type="button" onClick={() => setAddonsObj(prev => ({...prev, companions: opt}))} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${addonsObj.companions === opt ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"} ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}>{opt}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-emerald-400 font-bold ml-1 mb-3 block">Desired Pace</label>
                        <div className="flex flex-wrap gap-2">
                          {["Relaxed", "Balanced", "Fast-Paced"].map(opt => (
                            <button disabled={isRestoring} key={opt} type="button" onClick={() => setAddonsObj(prev => ({...prev, pace: opt}))} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${addonsObj.pace === opt ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"} ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-1 block">Extra Instructions for Boomer</label>
                    <textarea disabled={isRestoring} rows="2" placeholder="e.g., I want to keep my budget strictly under $1000..." value={formData.extra_info} onChange={e => setFormData({...formData, extra_info: e.target.value})} className={`w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white outline-none focus:border-emerald-500 focus:bg-slate-800 transition-colors text-sm resize-none ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}></textarea>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <button type="submit" disabled={isLoadingProfile || (!isRestoring && (!formData.exact_destination || !formData.travel_duration))} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {isRestoring ? "Re-Awaken Boomer" : "Wake Boomer!"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* PHASE B: THE MAIN DASHBOARD & COMMAND CENTER */}
      {/* ========================================== */}
      {viewPhase === "dashboard" && journeyPlan && (
        <div className="absolute inset-0 z-[45] animate-[slideDownFade_1s_ease-out_forwards]">
          
          {/* Horizontal Track (Aligned beside Boomer) */}
          <div className="absolute top-8 left-[330px] right-8 h-[180px] bg-slate-900/60 border border-slate-700/60 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col justify-center">
            
            <div className="flex justify-between text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 px-2">
              <span className="text-emerald-400">{formData.origin_city || "Origin"}</span>
              <span>Airport</span>
              <span>Dest. Airport</span>
              <span className="text-sky-400">{formData.exact_destination || "Destination"}</span>
            </div>

            <div className="w-full bg-slate-800 h-4 rounded-full relative shadow-inner border border-slate-700">
              {/* Progress Line */}
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 rounded-full transition-all duration-[1500ms] shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                style={{ width: `${progressPercent}%` }}
              ></div>
              
              {/* Checkpoints */}
              <div className="absolute top-1/2 -translate-y-1/2 left-[33%] w-2 h-2 bg-slate-400 rounded-full"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-[66%] w-2 h-2 bg-slate-400 rounded-full"></div>

              {/* The Moving Emoji Tracker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -ml-4 text-3xl transition-all duration-[1500ms] drop-shadow-xl z-10"
                style={{ left: `${progressPercent}%` }}
              >
                {thumbEmoji}
              </div>
            </div>
          </div>

          {/* Vertical Sidebar (Aligned below Boomer) */}
          <div className="absolute top-[230px] left-8 w-[280px] bottom-8 bg-slate-900/70 border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col backdrop-blur-md">
            <div className="flex flex-col gap-4 mb-8">
              <h3 className="text-emerald-400 font-black text-lg uppercase tracking-widest border-b border-slate-700 pb-2">{currentPhaseName} Steps</h3>
              <button 
                onClick={() => setShowFullPlanModal(true)} 
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-slate-600 shadow-md cursor-pointer"
              >
                View Full Plan
              </button>
            </div>
            
            <div className="relative pl-6 border-l-2 border-slate-700/50 space-y-6 flex-1 overflow-y-auto custom-scroll pr-2 pb-4">
              {activePhaseNames.map((stepName, idx) => {
                const globalIdx = currentPhaseName === "Post-Travel" ? preNames.length + transNames.length + idx :
                                  currentPhaseName === "Transit" ? preNames.length + idx : idx;
                
                const isPast = globalIdx < currentGlobalStep;
                const isCurrent = globalIdx === currentGlobalStep;
                
                return (
                  <div key={idx} className="relative group">
                    <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full transition-all duration-300
                      ${isCurrent ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] scale-125' : 
                        isPast ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-slate-800 border border-slate-600'}
                    `} />
                    <p className={`text-sm font-bold transition-all duration-300 leading-tight
                      ${isCurrent ? 'text-emerald-300' : isPast ? 'text-slate-500 line-through' : 'text-slate-400'}
                    `}>
                      {stepName}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MAIN CONTENT AREA: Maximize Space & Center Everything */}
          <div className="absolute top-[230px] left-[330px] right-8 bottom-8 bg-slate-900/60 border border-slate-700/60 rounded-3xl flex flex-col shadow-2xl overflow-hidden backdrop-blur-md">
            
            {/* Content Box */}
            <div className="flex-1 overflow-y-auto custom-scroll p-12 flex flex-col items-center">
              
              {!missionStarted ? (
                <div className="m-auto text-center animate-[slideDownFade_0.5s_ease-out_forwards]">
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center m-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <span className="text-5xl">🎯</span>
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">Journey Initialized</h2>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">Boomer has successfully compiled all travel parameters. Are you ready to begin step-by-step guidance?</p>
                  <button 
                    onClick={() => setMissionStarted(true)}
                    className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-all text-xl cursor-pointer"
                  >
                    Start Journey
                  </button>
                </div>
              ) : currentGlobalStep < totalSteps ? (
                <div className="w-full max-w-5xl animate-[slideDownFade_0.5s_ease-out_forwards]">
                  <h1 className="text-4xl lg:text-5xl font-black text-white mb-8 leading-tight tracking-wide drop-shadow-lg">
                    <span className="text-emerald-400 block mb-2 text-xl tracking-widest uppercase">Current Objective</span>
                    {allNames[currentGlobalStep]}
                  </h1>
                  
                  <div className="font-medium border-l-4 border-emerald-500 pl-8 py-2 mb-8 w-full transition-all">
                    {/* NEW: Use translated text if it exists in the dictionary! */}
                    {renderMarkdownBeautifully(translatedSteps[currentGlobalStep] || allData[currentGlobalStep])}
                  </div>

                  {/* SNUG BUTTONS */}
                  <div className="flex flex-col gap-6 mt-4 border-t border-slate-700/50 pt-8 w-full">
                    <label className="flex items-center gap-4 cursor-pointer group w-max">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={rogerChecked} 
                          onChange={(e) => setRogerChecked(e.target.checked)}
                          className="peer appearance-none w-8 h-8 border-2 border-slate-500 rounded-lg checked:bg-emerald-500 checked:border-emerald-400 transition-all cursor-pointer"
                        />
                        <svg className="absolute w-5 h-5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-2xl font-bold text-slate-300 group-hover:text-white transition-colors">Roger that.</span>
                    </label>

                    <button 
                      onClick={handleNextStep} // <-- UPDATED
                      disabled={!rogerChecked}
                      className="w-max px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer text-lg"
                    >
                      Completed & Next Step
                    </button>
                  </div>
                </div>
              ) : (
                <div className="m-auto text-center animate-[slideDownFade_0.5s_ease-out_forwards]">
                  <h1 className="text-6xl font-black text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">Mission Accomplished!</h1>
                  <p className="text-2xl text-slate-300 mb-12">Boomer has successfully guided you through all travel phases.</p>
                  <button 
                    onClick={handleSaveAndClose}
                    className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest uppercase rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer text-xl"
                  >
                    {state.token ? "Finish! Back to Map" : "Finish! Back to Map"}
                  </button>
                </div>
              )}
            </div>

            {/* RECTANGULAR BOTTOM LAYOUT (With Unified Sarvam Pill) */}
            {currentGlobalStep < totalSteps && missionStarted && (
              <div className="flex-none w-full bg-slate-950/90 border-t border-slate-800 p-5 flex justify-center items-center backdrop-blur-xl gap-6">
                
                {/* 1. THE UNIFIED PILL (Language + Translate + Round Listen) */}
                <div className="flex items-center bg-slate-800 rounded-full border border-slate-700 shadow-xl p-1.5 transition-all hover:border-slate-600">
                  
                  {/* Dropdown */}
                  <div className="relative">
                    <select 
                      value={targetLanguage} 
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="bg-transparent text-slate-300 font-bold pl-5 pr-8 py-2 outline-none cursor-pointer appearance-none text-center hover:text-white transition-colors"
                    >
                      <option value="en-IN" className="bg-slate-800 text-white">English</option>
                      <option value="te-IN" className="bg-slate-800 text-white">Telugu</option>
                      <option value="hi-IN" className="bg-slate-800 text-white">Hindi</option>
                      <option value="ta-IN" className="bg-slate-800 text-white">Tamil</option>
                      <option value="bn-IN" className="bg-slate-800 text-white">Bengali</option>
                      <option value="mr-IN" className="bg-slate-800 text-white">Marathi</option>
                      <option value="ml-IN" className="bg-slate-800 text-white">Malayalam</option>
                      <option value="kn-IN" className="bg-slate-800 text-white">Kannada</option>

                    </select>
                    {/* Custom tiny arrow for sleek look */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                  </div>

                  <div className="w-px h-6 bg-slate-700 mx-2"></div>

                  {/* Translate Text Button */}
                  <button 
                    onClick={handleTranslateStep}
                    disabled={isTranslating}
                    className={`px-4 py-2 text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50
                      ${translatedSteps[currentGlobalStep] ? 'text-sky-400' : 'text-slate-400 hover:text-sky-300'}`}
                  >
                    <span className="text-lg leading-none mt-[2px]">🌐</span>
                    <span className="tracking-wide">{isTranslating ? '...' : (translatedSteps[currentGlobalStep] ? 'Hide' : 'Translate')}</span>
                  </button>

                  <div className="w-px h-6 bg-slate-700 mx-2"></div>

                  {/* Round Listen Button */}
                  <button 
                    onClick={handlePlayAudio}
                    disabled={isAudioLoading}
                    className="w-10 h-10 ml-1 mr-1 bg-slate-700 hover:bg-emerald-600 text-white rounded-full transition-all shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                    title="Listen to step"
                  >
                    {isAudioLoading ? <span className="animate-spin text-sm">⏳</span> : <span className="text-lg leading-none ml-0.5">🔊</span>}
                  </button>

                </div>

                {/* 2. Talk to Boomer Button */}
                <button 
                  onClick={() => setViewPhase("chat")}
                  className="w-[250px] py-3.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 font-bold rounded-full transition-all border border-emerald-700/50 shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                >
                  <span className="text-2xl">💬</span> 
                  <span className="text-lg tracking-wide">Talk to Boomer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PHASE B.2: THE VIEW FULL PLAN MODAL        */}
      {/* ========================================== */}
      {showFullPlanModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex flex-col p-10 animate-[slideDownFade_0.3s_ease-out_forwards]">
          <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
            <h2 className="text-3xl font-black text-white tracking-widest uppercase">All Journey Steps</h2>
            <button onClick={() => setShowFullPlanModal(false)} className="text-slate-400 hover:text-red-500 text-2xl font-bold cursor-pointer transition-colors">✖</button>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto custom-scroll pr-4">
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-emerald-500/30">
              <h3 className="text-emerald-400 font-black text-xl mb-4 border-b border-slate-700 pb-2">1. Pre-Travel</h3>
              <ul className="space-y-3">
                {preNames.map((name, i) => (
                  <li key={i} className="text-sm font-bold text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">●</span> {name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-sky-500/30">
              <h3 className="text-sky-400 font-black text-xl mb-4 border-b border-slate-700 pb-2">2. Transit</h3>
              <ul className="space-y-3">
                {transNames.map((name, i) => (
                  <li key={i} className="text-sm font-bold text-slate-300 flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">●</span> {name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-pink-500/30">
              <h3 className="text-pink-400 font-black text-xl mb-4 border-b border-slate-700 pb-2">3. Post-Travel</h3>
              <ul className="space-y-3">
                {postNames.map((name, i) => (
                  <li key={i} className="text-sm font-bold text-slate-300 flex items-start gap-2">
                    <span className="text-pink-500 mt-0.5">●</span> {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PHASE C: THE CHAT MODAL (TALK TO BOOMER)   */}
      {/* ========================================== */}
      {viewPhase === "chat" && (
        <div className="absolute inset-0 z-[85] flex flex-col items-center justify-center p-8 animate-[slideDownFade_0.4s_ease-out_forwards]">
          <div className="w-full max-w-3xl bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden h-[70vh] mt-32">
            
            <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-emerald-400 font-bold tracking-widest uppercase text-sm">Here's Your Boomer</h3>
                <div className="px-3 py-1 bg-slate-900 rounded-full text-xs font-semibold text-slate-400 border border-slate-700">
                  Context: {allNames[currentGlobalStep] || "General"}
                </div>
              </div>
              {/* Back Button -> Text layout for clarity */}
              <button 
                onClick={() => setViewPhase("dashboard")} 
                className="text-slate-400 hover:text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600"
              >
                ← Back
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-500 italic mt-10">
                  Ask Boomer any doubt about this step...
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} flex-col`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[1.05rem] shadow-md
                    ${msg.sender === "user" 
                      ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-50 rounded-tr-sm self-end" 
                      : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm self-start"}
                  `}>
                    {msg.sender === "ai" ? renderMarkdownBeautifully(msg.text) : msg.text}
                  </div>
                  {msg.requiresAction && (
                    <div className="mt-3 flex gap-3 self-start">
                      <button onClick={() => setViewPhase("dashboard")} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-lg">
                        Yes, continue
                      </button>
                      <button onClick={() => setChatHistory(prev => [...prev.slice(0,-1), { ...msg, requiresAction: false }])} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-md">
                        No, wait
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="self-start max-w-[80%] p-4 rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400 rounded-tl-sm animate-pulse font-bold tracking-widest">
                  [ PROCESSING QUERY... ]
                </div>
              )}
              <div ref={chatEndRef} className="h-2"></div>
            </div>

            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex gap-3">
              <input 
                type="text" autoFocus placeholder="Type your doubt here..."
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendDoubt()}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <button 
                onClick={handleSendDoubt} disabled={isChatLoading || !chatInput.trim()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}