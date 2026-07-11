import React, { useState, useReducer, useRef, useEffect } from "react";
import { geoCentroid } from "d3-geo";
import Sidebar from "./Sidebar";
import MapDisplay from "./MapDisplay";
import CanvasOverlay from "./CanvasOverlay";
import JourneyPage from "../Phase-two_Frontend/JourneyPage"; 
import AuthOverlay from "../Phase-two_Frontend/AuthPage"; 
import { useNavigate, useLocation } from "react-router-dom";
import CompareCanvasOverlay from "./CompareCanvas";

const initialState = {
  token: localStorage.getItem("atlas_token") || null,
  authView: localStorage.getItem("atlas_token") ? "hidden" : "visible",
  theme: "treasure", 
  mapCenter: [10, 30],
  mapZoom: 1,
  isAutoZooming: false,
  countrySearch: "",
  selectedCountry: "",
  purposeInput: "General Knowledge",
  isBriefingActive: false,
  isCanvasExpanded: false,
  activeTab: "briefing",
  showDoubtsInput: false,
  doubtsText: "",
  isLoading: false,
  briefingData: null,
  tabContent: {},
  doubtsHistory: [],
  isJourneyActive: false,
  restoredJourneyData: null, // NEW STATE PROPERTY
  isCompareActive: false,
  compareData: null, // Will hold { countryA, countryB, listA, listB, purpose, basis }
  compareDoubtsHistory: [],
};

function dashboardReducer(state, action) {
  switch (action.type) {
    case "LOGIN_SUCCESS": return { ...state, token: action.payload, authView: "hidden" };
    case "SKIP_LOGIN": return { ...state, authView: "hidden" };
    case "LOGOUT": 
      localStorage.removeItem("atlas_token");
      return { ...initialState, token: null, authView: "visible" };

    case "SET_THEME": return { ...state, theme: action.payload };
    case "SET_SEARCH": return { ...state, countrySearch: action.payload };
    case "SET_PURPOSE": return { ...state, purposeInput: action.payload };
    case "FOCUS_COUNTRY":
      return {
        ...state,
        selectedCountry: action.payload.name,
        countrySearch: action.payload.name,
        mapCenter: action.payload.center,
        mapZoom: action.payload.zoom,
        isAutoZooming: true,
        showDoubtsInput: false,
        doubtsText: "",
        doubtsHistory: []
      };
    case "END_ZOOM": return { ...state, isAutoZooming: false };
    case "SET_MAP_POS": return { ...state, mapCenter: action.payload.center, mapZoom: action.payload.zoom };
    
    case "API_START": 
      return { ...state, isLoading: true, showDoubtsInput: false, doubtsText: "", doubtsHistory: [] };
    case "API_ERROR": return { ...state, isLoading: false };
    
    case "START_BRIEFING": return { ...state, isBriefingActive: true, activeTab: "briefing", isCompareActive: false };
    case "SET_BRIEFING_DATA": return { ...state, isLoading: false, briefingData: action.payload };
    case "SET_TAB_DATA": return { ...state, isLoading: false, tabContent: { ...state.tabContent, [action.payload.tabName]: action.payload.data } };
    
    case "ADD_DOUBT_MESSAGE":
      return { 
        ...state, 
        isLoading: action.payload.sender === 'user', 
        doubtsHistory: [...state.doubtsHistory, action.payload],
        doubtsText: action.payload.sender === 'user' ? "" : state.doubtsText 
      };
      
    case "SET_TAB": return { ...state, activeTab: action.payload };
    case "TOGGLE_EXPAND": return { ...state, isCanvasExpanded: !state.isCanvasExpanded };
    case "TOGGLE_DOUBTS": return { ...state, showDoubtsInput: action.payload };
    case "SET_DOUBTS_TEXT": return { ...state, doubtsText: action.payload };
    
    case "START_JOURNEY": return { ...state, isJourneyActive: true };
    case "CLOSE_JOURNEY": return { ...state, isJourneyActive: false, restoredJourneyData: null }; 
    
    case "RESTORE_JOURNEY": 
      return { ...state, isJourneyActive: true, restoredJourneyData: action.payload };

    // --- NEW: Instantly opens canvas and sets loading ---
    case "START_COMPARE":
      return {
        ...state,
        isCompareActive: true,
        isBriefingActive: false,
        compareData: { ...action.payload, listA: null, listB: null } // Clears old data to trigger loading UI
      };

    case "SET_COMPARE_DATA":
      return { 
        ...state, 
        isCompareActive: true, 
        isBriefingActive: false, // Ensures standard canvas closes
        compareData: action.payload,
        isLoading: false
      };
    case "CLOSE_COMPARE":
      return { 
        ...state, 
        isCompareActive: false,
        isCanvasExpanded: false, // <-- THIS WAS MISSING!
        mapCenter: [10, 30], 
        mapZoom: 1,          
        countrySearch: "",   
        selectedCountry: ""  
      };

    case "CLOSE_CANVAS": 
      return { 
        ...state, 
        isBriefingActive: false, 
        isCanvasExpanded: false,
        briefingData: null,
        tabContent: {},
        doubtsHistory: [],
        isLoading: false,
        showDoubtsInput: false,
        doubtsText: ""
      };
    default: return state;
  }
}

export default function BriefingDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [geoFeatures, setGeoFeatures] = useState([]);
  
  const activeRequestRef = useRef(null);
  const isInitialMount = useRef(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    if (state.authView === "visible") {
      if (!path.startsWith("/auth")) navigate("/auth", { replace: true });
    } else {
      if (path.startsWith("/auth") || path === "/") {
        navigate("/homepage", { replace: true });
      } 
      else if (isInitialMount.current && path !== "/homepage") {
        navigate("/homepage", { replace: true });
      }
    }
    
    isInitialMount.current = false;
  }, [state.authView, location.pathname, navigate]);

  // 1. INCOMING URL PARSER
  useEffect(() => {
    if (state.authView === "visible") return;

    const path = decodeURIComponent(location.pathname).replace(/^\/|\/$/g, '');
    const parts = path.split('/');
    
    // FIX 3: Added 'travelled', 'compare-history', and 'compare' so they don't auto-fill the search box!
    const isModalUrl = parts[0] === 'homepage' && ['profile', 'global-cache', 'archive', 'history', 'travelled', 'compare-history', 'compare'].includes(parts[1]);
    
    if (!path || path === 'homepage' || isModalUrl || parts[0] === 'auth') {
      // Don't close canvases if we are currently on a valid compare route
      if (parts[1] !== 'compare') {
        if (state.isBriefingActive) dispatch({ type: "CLOSE_CANVAS" });
        if (state.isJourneyActive) dispatch({ type: "CLOSE_JOURNEY" });
      }
      return;
    }

    const [cSlug, pSlug, vSlug] = parts;

    if (cSlug) {
      const countryName = cSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (state.selectedCountry.toLowerCase() !== countryName.toLowerCase()) {
         if (geoFeatures.length > 0) {
           const targetGeo = geoFeatures.find(geo => geo.properties.name?.toLowerCase() === countryName.toLowerCase());
           if (targetGeo) {
             dispatch({ type: "FOCUS_COUNTRY", payload: { name: targetGeo.properties.name, center: geoCentroid(targetGeo), zoom: 3.5 } });
           } else {
             dispatch({ type: "SET_SEARCH", payload: countryName });
           }
         } else {
           dispatch({ type: "SET_SEARCH", payload: countryName }); 
         }
      }
    }

    if (pSlug && pSlug !== 'general') {
      const purposeName = pSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (state.purposeInput.toLowerCase() !== purposeName.toLowerCase()) {
         dispatch({ type: "SET_PURPOSE", payload: purposeName });
      }
    }

    if (vSlug === 'briefing' && !state.isBriefingActive) dispatch({ type: "START_BRIEFING" });
    else if (vSlug === 'journey' && !state.isJourneyActive) dispatch({ type: "START_JOURNEY" });
    else if (!vSlug) {
      // If we navigate back to a base country URL (e.g. /india), ensure canvases close!
      if (state.isBriefingActive) dispatch({ type: "CLOSE_CANVAS" });
      if (state.isJourneyActive) dispatch({ type: "CLOSE_JOURNEY" });
    }
  }, [location.pathname, geoFeatures]); 

  // 2. OUTGOING URL PUSHER (Controls what URL is shown)
  useEffect(() => {
    if (state.authView === "visible") return;

    const currentPath = decodeURIComponent(location.pathname).replace(/^\/|\/$/g, '');
    const parts = currentPath.split('/');
    const isModalUrl = parts[0] === 'homepage' && ['profile', 'global-cache', 'archive', 'history', 'travelled', 'compare-history'].includes(parts[1]);
    
    if (isModalUrl || parts[0] === 'auth') return;

    const cSlug = state.selectedCountry ? state.selectedCountry.toLowerCase().replace(/\s+/g, '-') : '';
    const pSlug = state.purposeInput ? state.purposeInput.toLowerCase().replace(/[\s/]+/g, '-') : 'general';

    let newUrl = '/homepage';
    
    // FIX 4: Compare Routing Support!
    if (state.isCompareActive && state.compareData?.countryA && state.compareData?.countryB) {
      const ca = state.compareData.countryA.toLowerCase().replace(/\s+/g, '-');
      const cb = state.compareData.countryB.toLowerCase().replace(/\s+/g, '-');
      newUrl = `/homepage/compare/${ca}-vs-${cb}`;
    }
    else if (state.isJourneyActive && cSlug) newUrl = `/${cSlug}/${pSlug}/journey`;
    else if (state.isBriefingActive && cSlug) newUrl = `/${cSlug}/${pSlug}/briefing`;
    else if (cSlug) newUrl = `/${cSlug}`;

    if (currentPath !== newUrl.replace(/^\/|\/$/g, '')) {
      if (state.selectedCountry !== "" || state.isCompareActive) {
        navigate(newUrl); 
      }
    }
  }, [state.selectedCountry, state.purposeInput, state.isBriefingActive, state.isJourneyActive, state.isCompareActive, state.compareData, navigate]);


  const getAuthHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    return headers;
  };

  const killActiveRequest = () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  };

  const handleCloseCanvas = () => {
    killActiveRequest(); 
    dispatch({ type: "CLOSE_CANVAS" }); 
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- UPDATED: Global Compare Fetcher ---
  const fetchComparison = async (overrideData = null) => {
    // Prevent React MouseEvent from messing up our data
    const safeOverride = overrideData && !overrideData.nativeEvent ? overrideData : null;
    
    // If called from Sidebar, it uses safeOverride. If called from Canvas "Re-Compare", it uses state!
    const dataToFetch = safeOverride || state.compareData;
    
    if (!dataToFetch?.countryA || !dataToFetch?.countryB) return;
    
    killActiveRequest();
    activeRequestRef.current = new AbortController();
    
    // Instantly slide up the canvas and trigger the loading UI!
    dispatch({ type: "START_COMPARE", payload: dataToFetch });
    dispatch({ type: "API_START" });

    try {
      const response = await fetch(`${API_URL}/api/compare`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          countryA: dataToFetch.countryA,
          countryB: dataToFetch.countryB,
          purpose: dataToFetch.purpose,
          basis: dataToFetch.basis
        }),
        signal: activeRequestRef.current.signal
      });

      if (!response.ok) throw new Error("Comparison failed");
      const result = await response.json();
      
      // Populate the data and stop the loading animation
      dispatch({ 
        type: "SET_COMPARE_DATA", 
        payload: {
          ...dataToFetch,
          listA: result.dataA,
          listB: result.dataB,
        } 
      });
    } catch (error) {
      if (error.name !== "AbortError") dispatch({ type: "API_ERROR" });
    }
  };

  const fetchBriefing = async (country, purpose) => {
    if (!country) return;
    
    killActiveRequest(); 
    activeRequestRef.current = new AbortController();

    const finalPurpose = purpose || "General Knowledge";
    
    dispatch({ type: "START_BRIEFING" });
    dispatch({ type: "API_START" });
    
    try {
      const response = await fetch(`${API_URL}/api/briefing`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ country, purpose: finalPurpose }),
        signal: activeRequestRef.current.signal
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete JSON strings in the buffer for the next chunk

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "chunk") {
              fullText += parsed.text;
              dispatch({ type: "SET_BRIEFING_DATA", payload: fullText });
            }
          } catch (e) {
            console.error("Failed to parse stream line:", line);
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("AI Briefing Terminated by User.");
      } else {
        console.error("Briefing Error:", error);
        dispatch({ type: "API_ERROR" });
      }
    }
  };

  const fetchTab = async (tabName) => {
    if (state.tabContent[tabName] || tabName === "briefing") return; 
    
    killActiveRequest();
    activeRequestRef.current = new AbortController();

    dispatch({ type: "API_START" });
    try {
      const response = await fetch(`${API_URL}/api/tab`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ country: state.selectedCountry, purpose: state.purposeInput || "General Knowledge", tabName }),
        signal: activeRequestRef.current.signal
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "chunk") {
              fullText += parsed.text;
              dispatch({ type: "SET_TAB_DATA", payload: { tabName, data: fullText } });
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") dispatch({ type: "API_ERROR" });
    }
  };

  const sendDoubt = async (doubtText) => {
    if (!doubtText.trim()) return;
    
    killActiveRequest();
    activeRequestRef.current = new AbortController();

    dispatch({ type: "ADD_DOUBT_MESSAGE", payload: { sender: 'user', text: doubtText } });
    
    try {
      const response = await fetch(`${API_URL}/api/doubt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          country: state.selectedCountry,
          purpose: state.purposeInput || "General Knowledge",
          tabName: state.activeTab === "briefing" ? "General Info" : state.activeTab,
          doubt: doubtText
        }),
        signal: activeRequestRef.current.signal
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          dispatch({ type: "ADD_DOUBT_MESSAGE", payload: { sender: 'ai', text: fullText } });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "chunk") {
              fullText += parsed.text;
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        dispatch({ type: "API_ERROR" });
        dispatch({ type: "ADD_DOUBT_MESSAGE", payload: { sender: 'ai', text: "❌ Connection to Intelligence Core lost." } });
      }
    }
  };

  const triggerCountryFocus = (countryName, geographiesArray = geoFeatures) => {
    if (!countryName) return;
    
    // Locates the country safely because MapDisplay already forced all names to match!
    const targetGeo = geographiesArray.find(geo => geo.properties.name?.toLowerCase() === countryName.toLowerCase());

    if (targetGeo) {
      const rawCentroid = geoCentroid(targetGeo);
      
      // X-AXIS OFFSET: Adjust rawCentroid[0] (+ shifts camera right so country appears LEFT on screen)
      // Y-AXIS OFFSET: Adjust rawCentroid[1] (- shifts camera down so country appears HIGHER on screen)
      const adjustedCentroid = [rawCentroid[0] -8, rawCentroid[1] - 10]; 

      let dynamicZoom = 2.5;
      const area = targetGeo.properties.AREA || 100000;
      if (area < 5000) dynamicZoom = 6;
      if (area > 500000) dynamicZoom = 2.2;
      
      dispatch({ type: "FOCUS_COUNTRY", payload: { name: countryName, center: adjustedCentroid, zoom: dynamicZoom } });
      setTimeout(() => dispatch({ type: "END_ZOOM" }), 1500);
    }
  };

  const wrapperBg = state.theme === "normal" ? "bg-[#7aa9ff]" : state.theme === "dark" ? "bg-[#020617]" : "bg-[#afb68e]";

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden relative">
      
      {state.authView === "visible" && <AuthOverlay dispatch={dispatch} />}

      <div className="absolute top-0 left-0 h-full z-20">
        {/* Pass fetchComparison into the Sidebar! */}
        <Sidebar state={state} dispatch={dispatch} geoFeatures={geoFeatures} triggerCountryFocus={triggerCountryFocus} fetchBriefing={fetchBriefing} fetchComparison={fetchComparison} />
      </div>
      <div className={`flex-1 flex flex-col ${wrapperBg} overflow-hidden transition-colors duration-500`}>
        <MapDisplay state={state} dispatch={dispatch} geoFeatures={geoFeatures} setGeoFeatures={setGeoFeatures} triggerCountryFocus={triggerCountryFocus} fetchBriefing={fetchBriefing} />
        
        {/* Standard Briefing Canvas Overlay */}
        <CanvasOverlay 
          state={state} 
          dispatch={dispatch} 
          fetchBriefing={fetchBriefing}
          fetchTab={fetchTab}
          sendDoubt={sendDoubt}
          handleCloseCanvas={handleCloseCanvas} 
        />

        {/* NEW Compare Canvas Overlay */}
        <CompareCanvasOverlay
          state={state}
          dispatch={dispatch}
          fetchComparison={fetchComparison}
          handleCloseCompare={() => {
            killActiveRequest();
            dispatch({ type: "CLOSE_COMPARE" });
          }}
        />
      </div>

      {state.isJourneyActive && (
        <JourneyPage state={state} dispatch={dispatch} />
      )}
    </div>
  );
}