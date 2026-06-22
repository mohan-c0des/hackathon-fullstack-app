import React, { useState, useReducer, useRef } from "react";
import { geoCentroid } from "d3-geo";
import Sidebar from "./Sidebar";
import MapDisplay from "./MapDisplay";
import CanvasOverlay from "./CanvasOverlay";

// Generates a unique ID per browser so deployed users don't share history
const getOrCreateUserId = () => {
  let id = localStorage.getItem("atlas_intel_uid");
  if (!id) {
    id = "usr_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("atlas_intel_uid", id);
  }
  return id;
};

const initialState = {
  userId: getOrCreateUserId(),
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
  doubtsHistory: []
};

function dashboardReducer(state, action) {
  switch (action.type) {
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
      return { 
        ...state, 
        isLoading: true,
        showDoubtsInput: false,
        doubtsText: "",
        doubtsHistory: []
      };
    case "API_ERROR": return { ...state, isLoading: false };
    
    case "START_BRIEFING": return { ...state, isBriefingActive: true, activeTab: "briefing" };
    
    case "SET_BRIEFING_DATA": 
      return { ...state, isLoading: false, briefingData: action.payload };
    
    case "SET_TAB_DATA": 
      return { ...state, isLoading: false, tabContent: { ...state.tabContent, [action.payload.tabName]: action.payload.data } };
      
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

  const fetchBriefing = async (country, purpose) => {
    if (!country) return;
    
    killActiveRequest(); 
    activeRequestRef.current = new AbortController();

    const finalPurpose = purpose || "General Knowledge";
    
    dispatch({ type: "START_BRIEFING" });
    dispatch({ type: "API_START" });
    
    try {
      const response = await fetch("http://localhost:8000/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-ID": state.userId },
        body: JSON.stringify({ country, purpose: finalPurpose }),
        signal: activeRequestRef.current.signal
      });
      const result = await response.json();
      dispatch({ type: "SET_BRIEFING_DATA", payload: result.data });
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
      const response = await fetch("http://localhost:8000/api/tab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: state.selectedCountry, purpose: state.purposeInput || "General Knowledge", tabName }),
        signal: activeRequestRef.current.signal
      });
      const result = await response.json();
      dispatch({ type: "SET_TAB_DATA", payload: { tabName, data: result.data } });
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
      const response = await fetch("http://localhost:8000/api/doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: state.selectedCountry,
          purpose: state.purposeInput || "General Knowledge",
          tabName: state.activeTab === "briefing" ? "General Info" : state.activeTab,
          doubt: doubtText
        }),
        signal: activeRequestRef.current.signal
      });
      const result = await response.json();
      dispatch({ type: "ADD_DOUBT_MESSAGE", payload: { sender: 'ai', text: result.data } });
    } catch (error) {
      if (error.name !== "AbortError") {
        dispatch({ type: "API_ERROR" });
        dispatch({ type: "ADD_DOUBT_MESSAGE", payload: { sender: 'ai', text: "❌ Connection to Intelligence Core lost." } });
      }
    }
  };

  const triggerCountryFocus = (countryName, geographiesArray = geoFeatures) => {
    if (!countryName) return;
    const targetGeo = geographiesArray.find(geo => geo.properties.name?.toLowerCase() === countryName.toLowerCase());
    if (targetGeo) {
      const centroid = geoCentroid(targetGeo);
      let dynamicZoom = 3.5;
      const area = targetGeo.properties.AREA || 100000;
      if (area < 5000) dynamicZoom = 6;
      if (area > 500000) dynamicZoom = 2.2;
      dispatch({ type: "FOCUS_COUNTRY", payload: { name: countryName, center: centroid, zoom: dynamicZoom } });
      setTimeout(() => dispatch({ type: "END_ZOOM" }), 1500);
    }
  };

  const wrapperBg = state.theme === "light" ? "bg-[#f8fafc]" : state.theme === "dark" ? "bg-[#020617]" : "bg-[#afb68e]";

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden relative">
      <div className="absolute top-0 left-0 h-full z-20">
        <Sidebar state={state} dispatch={dispatch} geoFeatures={geoFeatures} triggerCountryFocus={triggerCountryFocus} fetchBriefing={fetchBriefing} />
      </div>
      <div className={`flex-1 flex flex-col ${wrapperBg} overflow-hidden transition-colors duration-500`}>
        <MapDisplay state={state} dispatch={dispatch} geoFeatures={geoFeatures} setGeoFeatures={setGeoFeatures} triggerCountryFocus={triggerCountryFocus} fetchBriefing={fetchBriefing} />
        <CanvasOverlay 
          state={state} 
          dispatch={dispatch} 
          fetchBriefing={fetchBriefing}
          fetchTab={fetchTab}
          sendDoubt={sendDoubt}
          handleCloseCanvas={handleCloseCanvas} 
        />
      </div>
    </div>
  );
}