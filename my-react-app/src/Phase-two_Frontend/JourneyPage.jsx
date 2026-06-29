import React, { useState, useRef, useEffect } from "react";

export default function JourneyPage({ state, dispatch }) {
  const [phase, setPhase] = useState(0); 
  // Phases: 0 = Onboarding, 1 = Pre-Travel, 2 = Transit, 3 = Post-Travel
  
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "ai",
      text: `Hey! I'm **Boomer**, your personal Travel Concierge. \n\nI see you're planning a trip to **${state.selectedCountry}** for **${state.purposeInput}**. \n\nBefore I pull up the visa requirements and safety advisories, I need a few quick details from you to make sure everything is 100% accurate.`,
      isForm: true
    }
  ]);

  const [formData, setFormData] = useState({
    originCity: "",
    destinationCity: "",
    citizenship: "",
    age: ""
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleFormSubmit = () => {
    setChatHistory(prev => [
      ...prev, 
      { sender: "user", text: `I'm travelling from ${formData.originCity} to ${formData.destinationCity}. I am a ${formData.citizenship} citizen, age ${formData.age}.` },
      { sender: "ai", text: "Got it! Generating your Pre-Travel requirements now. I am checking visa policies, flight routes, and real-time safety advisories...", isTyping: true }
    ]);

    // In Strike 2, we will call the backend API here. For now, we simulate advancing the phase.
    setTimeout(() => {
      setPhase(1);
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { 
          sender: "ai", 
          text: `### Pre-Travel Requirements (Simulated)\n\n**Visa:** E-Visa required. Costs $45.\n**Safety:** Level 1 - Exercise normal precautions.\n\nLet me know when you have booked your tickets and are ready to head to the airport!` 
        };
        return newHistory;
      });
    }, 2000);
  };

  return (
    <div className="absolute inset-0 bg-[#020617] z-50 flex animate-[slideDownFade_0.4s_ease-out_forwards]">
      
      {/* LEFT SIDE: Vertical Stepper */}
      <div className="w-[300px] border-r border-slate-800 bg-[#0f172a]/50 backdrop-blur-md p-8 flex flex-col relative">
        <button 
          onClick={() => dispatch({ type: "CLOSE_JOURNEY" })}
          className="absolute top-6 right-6 text-slate-500 hover:text-red-500 text-xl font-bold cursor-pointer"
        >
          ✖
        </button>
        
        <h2 className="text-2xl font-black text-emerald-400 mb-10 tracking-widest uppercase">
          Journey Tracker
        </h2>

        <div className="relative flex-1 flex flex-col">
          {/* Background Track Line */}
          <div className="absolute left-[15px] top-4 bottom-10 w-[2px] bg-slate-800 z-0"></div>
          
          {/* Active Glowing Line */}
          <div 
            className="absolute left-[15px] top-4 w-[2px] bg-emerald-500 z-0 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-1000 ease-in-out"
            style={{ height: `${(phase / 3) * 100}%` }}
          ></div>

          {[
            { id: 0, label: "Identity Check", desc: "Profile setup" },
            { id: 1, label: "Pre-Travel", desc: "Visas & Advisories" },
            { id: 2, label: "Transit", desc: "Navigating the move" },
            { id: 3, label: "Arrival", desc: "Settling & Living" }
          ].map((step) => {
            const isCompleted = phase > step.id;
            const isActive = phase === step.id;
            const isFuture = phase < step.id;

            return (
              <div key={step.id} className="relative z-10 flex items-start gap-6 mb-12">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : ''}
                  ${isActive ? 'bg-slate-900 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]' : ''}
                  ${isFuture ? 'bg-slate-900 border-slate-700 text-slate-600' : ''}
                `}>
                  {isCompleted ? "✓" : step.id + 1}
                </div>
                <div className="pt-1">
                  <h3 className={`font-bold text-[1.1rem] transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {step.label}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE: Chat & Content */}
      <div className="flex-1 flex flex-col relative bg-slate-950/80">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center px-8 bg-slate-900/50">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mr-3"></div>
          <span className="font-bold text-slate-200 tracking-wider">BOOMER <span className="text-slate-500 font-normal ml-2">| Live Travel Concierge</span></span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`
                  max-w-[80%] p-5 rounded-2xl text-[1.05rem] leading-[1.6] shadow-md
                  ${msg.sender === "user" 
                    ? "bg-slate-700 text-white rounded-tr-sm" 
                    : "bg-slate-800/80 border border-emerald-500/20 text-slate-200 rounded-tl-sm"}
                `}>
                  
                  {/* Parse Basic Markdown */}
                  <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />

                  {/* Typing Indicator */}
                  {msg.isTyping && (
                    <div className="mt-3 flex gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    </div>
                  )}

                  {/* Render the Onboarding Form embedded in Chat */}
                  {msg.isForm && phase === 0 && (
                    <div className="mt-6 bg-slate-900/50 border border-slate-700 p-5 rounded-xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Current City</label>
                          <input type="text" className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500" 
                            value={formData.originCity} onChange={e => setFormData({...formData, originCity: e.target.value})} placeholder="e.g. New York"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Destination City</label>
                          <input type="text" className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500" 
                            value={formData.destinationCity} onChange={e => setFormData({...formData, destinationCity: e.target.value})} placeholder="e.g. Paris"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Citizenship</label>
                          <input type="text" className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500" 
                            value={formData.citizenship} onChange={e => setFormData({...formData, citizenship: e.target.value})} placeholder="e.g. USA"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Age</label>
                          <input type="number" className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500" 
                            value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="e.g. 24"/>
                        </div>
                      </div>
                      <button 
                        onClick={handleFormSubmit}
                        disabled={!formData.originCity || !formData.destinationCity || !formData.citizenship || !formData.age}
                        className="mt-5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Save Profile & Start Phase 1
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}
            <div ref={chatEndRef} className="h-4"></div>
          </div>
        </div>

        {/* User Input Area */}
        <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center px-8">
           <input 
              type="text" 
              placeholder="Ask Boomer anything..." 
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-l-lg py-4 px-6 outline-none focus:border-emerald-500"
            />
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-r-lg transition-colors cursor-pointer">
              Send
            </button>
        </div>

      </div>
    </div>
  );
}