import React, { useState, useReducer } from "react";
import { geoCentroid } from "d3-geo";
import Sidebar from "./Sidebar";
import MapDisplay from "./MapDisplay";
import CanvasOverlay from "./CanvasOverlay";

const initialState = {
  mapCenter: [10, 30],
  mapZoom: 1,
  isAutoZooming: false,
  countrySearch: "",
  selectedCountry: "",
  purposeInput: "",
  isBriefingActive: false,
  isCanvasExpanded: false,
  activeTab: "briefing",
  showDoubtsInput: false,
  doubtsText: ""
};

function dashboardReducer(state, action) {
  switch (action.type) {
    case "SET_SEARCH": return { ...state, countrySearch: action.payload };
    case "SET_PURPOSE": return { ...state, purposeInput: action.payload };
    case "FOCUS_COUNTRY":
      return {
        ...state,
        selectedCountry: action.payload.name,
        countrySearch: action.payload.name,
        mapCenter: action.payload.center,
        mapZoom: action.payload.zoom,
        isAutoZooming: true
      };
    case "END_ZOOM": return { ...state, isAutoZooming: false };
    case "SET_MAP_POS": return { ...state, mapCenter: action.payload.center, mapZoom: action.payload.zoom };
    case "START_BRIEFING": return { ...state, isBriefingActive: true };
    case "CLOSE_CANVAS": return { ...state, isBriefingActive: false, isCanvasExpanded: false };
    case "TOGGLE_EXPAND": return { ...state, isCanvasExpanded: !state.isCanvasExpanded };
    case "SET_TAB": return { ...state, activeTab: action.payload };
    case "TOGGLE_DOUBTS": return { ...state, showDoubtsInput: action.payload };
    case "SET_DOUBTS_TEXT": return { ...state, doubtsText: action.payload };
    default: return state;
  }
}

export default function BriefingDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [geoFeatures, setGeoFeatures] = useState([]);

  // Centralized Zoom Logic
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
      
      // Turn off cinematic pan after 1.5s
      setTimeout(() => dispatch({ type: "END_ZOOM" }), 1500);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden relative">
      
      {/* ADDED 'absolute h-full' TO MAKE IT FLOAT OVER THE MAP */}
      <div className="absolute top-0 left-0 h-full z-20">
        <Sidebar 
          state={state} 
          dispatch={dispatch} 
          geoFeatures={geoFeatures} 
          triggerCountryFocus={triggerCountryFocus} 
        />
      </div>

      <div className="flex-1 flex flex-col bg-[#afb68e] overflow-hidden">
        <MapDisplay 
          state={state} 
          dispatch={dispatch} 
          geoFeatures={geoFeatures} 
          setGeoFeatures={setGeoFeatures}
          triggerCountryFocus={triggerCountryFocus}
        />

        {state.isBriefingActive && (
          <CanvasOverlay state={state} dispatch={dispatch} />
        )}
      </div>

    </div>
  );
}