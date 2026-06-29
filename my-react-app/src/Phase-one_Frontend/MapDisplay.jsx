import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import { geoCentroid, geoArea } from "d3-geo";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function MapDisplay({ state, dispatch, geoFeatures, setGeoFeatures, triggerCountryFocus, fetchBriefing }) {
  
  const [hudIntel, setHudIntel] = useState(null);

  useEffect(() => {
    const fetchQuickIntel = async () => {
      if (!state.selectedCountry) {
        setHudIntel(null);
        return;
      }
      try {
        // Send the secure JWT token if logged in!
        const headers = state.token ? { "Authorization": `Bearer ${state.token}` } : {};
        const response = await fetch(`http://localhost:8000/api/quick-intel?country=${state.selectedCountry}`, { headers });
        const result = await response.json();
        setHudIntel(result.data);
      } catch (error) {
        console.error("Failed to fetch HUD Intel", error);
      }
    };
    fetchQuickIntel();
  }, [state.selectedCountry, state.token]);

  const handleMapCountryClick = (countryName) => {
    triggerCountryFocus(countryName);
  };

  const selectedGeo = geoFeatures.find(g => (g.properties.name || "").toLowerCase() === (state.selectedCountry || "").toLowerCase());
  const selectedCentroid = selectedGeo ? geoCentroid(selectedGeo) : null;
  
  const isValidCentroid = selectedCentroid && !isNaN(selectedCentroid[0]) && !isNaN(selectedCentroid[1]);

  const dotScale = 1.5 / (state.mapZoom || 1);
  const hudScale = 3 / (state.mapZoom || 1); 

  const safeText = (val) => {
    if (val === null || val === undefined) return "Unknown";
    if (typeof val === 'object') {
       return String(val.text || val.string || val.value || val.name || val.String || "Unknown");
    }
    return String(val);
  };

  const safeArray = (arr) => Array.isArray(arr) ? arr : [];

  // Theme styling logic integrated perfectly
  const theme = state.theme || "treasure";
  let mapStyles = {};
  
  if (theme === "dark") {
    mapStyles = {
      default: { fill: "#1e293b", stroke: "#0f172a", strokeWidth: 0.5 },
      hover: { fill: "#334155", stroke: "#38bdf8", strokeWidth: 1, cursor: "pointer" },
      pressed: { fill: "#0f172a", outline: "none" },
      selected: { fill: "#3b82f6", stroke: "#60a5fa", strokeWidth: 1 }
    };
  } else if (theme === "light") {
    mapStyles = {
      default: { fill: "#e2e8f0", stroke: "#cbd5e1", strokeWidth: 0.5 },
      hover: { fill: "#cbd5e1", stroke: "#3b82f6", strokeWidth: 1, cursor: "pointer" },
      pressed: { fill: "#94a3b8", outline: "none" },
      selected: { fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1 }
    };
  } else {
    // Treasure (Original)
    mapStyles = {
      default: { fill: "#dbb086a9", stroke: "#0a0909", strokeWidth: 1 },
      hover: { fill: "#895a2aa9", stroke: "#062e21", strokeWidth: 2, cursor: "pointer" },
      pressed: { fill: "#820c0c", outline: "none" },
      selected: { fill: "#1b5949", stroke: "#ffffffad", strokeWidth: 1 }
    };
  }

  // Adjusted offsets to accommodate the new compact layout
  const leftStats = [
    { label: "POPULATION", value: hudIntel?.population, yOffset: -22, color: "#38bdf8" },
    { label: "AREA", value: hudIntel?.area, yOffset: -7, color: "#38bdf8" },
    { label: "STATES", value: hudIntel?.states, yOffset: 8, color: "#38bdf8" },
    { label: "CAPITAL", value: hudIntel?.capital, yOffset: 23, color: "#38bdf8" }
  ];

  const rightStats = [
    { label: "GOV TYPE", value: hudIntel?.government, yOffset: -22, color: "#10b981" },
    { label: "LEADER", value: hudIntel?.leader, yOffset: -7, color: "#10b981" },
    { label: "LANGUAGE", value: hudIntel?.language, yOffset: 8, color: "#10b981" },
    { label: "RELIGION", value: hudIntel?.religion, yOffset: 23, color: "#10b981" }
  ];

  return (
    <div className={`
      transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden bg-transparent
      ${state.isCanvasExpanded ? "h-0 flex-none opacity-0 pointer-events-none" : "flex-1 min-h-[50%]"}
      ${state.isAutoZooming ? "[&_g]:transition-transform [&_g]:duration-1500 [&_g]:ease-[cubic-bezier(0.34,1.56,0.64,1)]" : ""}
    `}>
      
      {/* THE 4 CORNER NEO4J RECOMMENDATION BOXES */}
      {hudIntel && state.selectedCountry && (
        <>
          <div className="absolute top-4 left-[380px] z-10 bg-slate-900/90 backdrop-blur-md border border-amber-500/50 rounded-lg p-3 w-48 shadow-[0_0_15px_rgba(245,158,11,0.3)] pointer-events-auto">
            <h4 className="text-amber-400 text-[11px] font-bold tracking-widest mb-2 uppercase border-b border-amber-500/30 pb-1">Similar Culture</h4>
            <ul className="space-y-1">
              {safeArray(hudIntel.rec_culture).length > 0 ? safeArray(hudIntel.rec_culture).map(c => (
                <li key={c} onClick={() => handleMapCountryClick(c)} className="text-slate-200 text-sm cursor-pointer hover:text-amber-300 hover:pl-1 transition-all">{safeText(c)}</li>
              )) : <li className="text-slate-500 text-sm italic">No data mapped</li>}
            </ul>
          </div>

          <div className="absolute bottom-4 left-[380px] z-10 bg-slate-900/90 backdrop-blur-md border border-pink-500/50 rounded-lg p-3 w-48 shadow-[0_0_15px_rgba(236,72,153,0.3)] pointer-events-auto">
            <h4 className="text-pink-400 text-[11px] font-bold tracking-widest mb-2 uppercase border-b border-pink-500/30 pb-1">Friends / Enemies</h4>
            <ul className="space-y-1">
              {safeArray(hudIntel.rec_relations).length > 0 ? safeArray(hudIntel.rec_relations).map(c => (
                <li key={c} onClick={() => handleMapCountryClick(c)} className="text-slate-200 text-sm cursor-pointer hover:text-pink-300 hover:pl-1 transition-all">{safeText(c)}</li>
              )) : <li className="text-slate-500 text-sm italic">No data mapped</li>}
            </ul>
          </div>

          <div className="absolute top-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-sky-500/50 rounded-lg p-3 w-48 shadow-[0_0_15px_rgba(56,189,248,0.3)] pointer-events-auto">
            <h4 className="text-sky-400 text-[11px] font-bold tracking-widest mb-2 uppercase border-b border-sky-500/30 pb-1">Shared Language</h4>
            <ul className="space-y-1">
              {safeArray(hudIntel.rec_language).length > 0 ? safeArray(hudIntel.rec_language).map(c => (
                <li key={c} onClick={() => handleMapCountryClick(c)} className="text-slate-200 text-sm cursor-pointer hover:text-sky-300 hover:pl-1 transition-all">{safeText(c)}</li>
              )) : <li className="text-slate-500 text-sm italic">No data mapped</li>}
            </ul>
          </div>

          <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-emerald-500/50 rounded-lg p-3 w-48 shadow-[0_0_15px_rgba(16,185,129,0.3)] pointer-events-auto">
            <h4 className="text-emerald-400 text-[11px] font-bold tracking-widest mb-2 uppercase border-b border-emerald-500/30 pb-1">Specific Recognition</h4>
            <ul className="space-y-1">
              {safeArray(hudIntel.rec_economy).length > 0 ? safeArray(hudIntel.rec_economy).map(c => (
                <li key={c} onClick={() => handleMapCountryClick(c)} className="text-slate-200 text-sm cursor-pointer hover:text-emerald-300 hover:pl-1 transition-all">{safeText(c)}</li>
              )) : <li className="text-slate-500 text-sm italic">No data mapped</li>}
            </ul>
          </div>
        </>
      )}

      <ComposableMap projection="geoMercator" viewBox="0 0 800 450" className="w-full h-full outline-none pointer-events-auto">
        
        {/* IRON MAN GLOW FILTERS */}
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ZoomableGroup 
          zoom={state.mapZoom} 
          center={state.mapCenter} 
          onMoveEnd={(pos) => dispatch({ type: "SET_MAP_POS", payload: { center: pos.coordinates, zoom: pos.zoom }})}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              if (geoFeatures.length === 0 && geographies.length > 0) setGeoFeatures(geographies);
              return geographies.map((geo) => {
                const countryName = geo.properties.name || "";
                const isSelected = state.selectedCountry === countryName;
                
                const area = geoArea(geo); 
                const isHuge = area > 0.035; 
                const isLarge = area > 0.01; 
                const showLabel = isHuge || (isLarge && state.mapZoom > 2) || (state.mapZoom > 4.5);
                const centroid = geoCentroid(geo);

                return (
                  <React.Fragment key={geo.rsmKey}>
                    <Geography
                      geography={geo}
                      onClick={() => handleMapCountryClick(countryName)}
                      data-tooltip-id="global-map-tooltip" data-tooltip-content={countryName}
                      className="outline-none transition-colors duration-300"
                      style={{
                        default: isSelected ? mapStyles.selected : mapStyles.default,
                        hover: mapStyles.hover,
                        pressed: mapStyles.pressed
                      }}
                    />
                    
                    {showLabel && !isSelected && centroid && !isNaN(centroid[0]) && !isNaN(centroid[1]) && (
                      <Marker coordinates={centroid}>
                        <text
                          textAnchor="middle" y={2}
                          className="fill-slate-50 font-semibold pointer-events-none tracking-[0.2px] font-sans"
                          style={{ fontSize: isHuge ? "3px" : "1.8px", textShadow: "0px 0px 2px rgba(0,0,0,0.8), 0px 0px 4px rgba(0,0,0,0.5)" }}
                        >
                          {countryName}
                        </text>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              });
            }}
          </Geographies>

          {/* INNER HUD: RADIANT, COMPACT & CONNECTED */}
          {state.selectedCountry && hudIntel && isValidCentroid && (
            <Marker coordinates={selectedCentroid} className="transition-opacity duration-700 pointer-events-none">
              
              <circle r={2 * dotScale} fill="#38bdf8" className="animate-pulse"/>
              <circle r={0.8 * dotScale} fill="#fff" />

              {/* LEFT SIDE RADIANT STATS */}
              {leftStats.map((stat, idx) => {
                const endX = -18 * hudScale;
                const lineY = stat.yOffset * hudScale;
                const boxWidth = 50 * hudScale;
                const boxHeight = 12 * hudScale;
                const rectX = endX - boxWidth;
                const rectY = lineY - (boxHeight / 2);

                return (
                  <g key={`left-${idx}`}>
                    {/* Mechanical Polyline Connector */}
                    <polyline points={`0,0 -8,${lineY} ${endX},${lineY}`} fill="none" stroke={stat.color} strokeWidth={0.5 * hudScale} opacity="0.8" filter="url(#neonGlow)"/>
                    {/* Compact Glowing Box */}
                    <rect x={rectX} y={rectY} width={boxWidth} height={boxHeight} fill="#020617" fillOpacity="0.75" stroke={stat.color} strokeWidth={0.4 * hudScale} rx={1 * hudScale} filter="url(#neonGlow)"/>
                    {/* Stacked Text */}
                    <text x={rectX + boxWidth - (2*hudScale)} y={rectY + 4*hudScale} textAnchor="end" fill={stat.color} fontSize={2.2 * hudScale} className="font-black tracking-widest">{stat.label}</text>
                    <text x={rectX + boxWidth - (2*hudScale)} y={rectY + 9.5*hudScale} textAnchor="end" fill="#f8fafc" fontSize={3.2 * hudScale} className="font-bold">{safeText(stat.value)}</text>
                  </g>
                );
              })}

              {/* RIGHT SIDE RADIANT STATS */}
              {rightStats.map((stat, idx) => {
                const endX = 18 * hudScale;
                const lineY = stat.yOffset * hudScale;
                const boxWidth = 50 * hudScale;
                const boxHeight = 12 * hudScale;
                const rectX = endX;
                const rectY = lineY - (boxHeight / 2);

                return (
                  <g key={`right-${idx}`}>
                    {/* Mechanical Polyline Connector */}
                    <polyline points={`0,0 8,${lineY} ${endX},${lineY}`} fill="none" stroke={stat.color} strokeWidth={0.5 * hudScale} opacity="0.8" filter="url(#neonGlow)"/>
                    {/* Compact Glowing Box */}
                    <rect x={rectX} y={rectY} width={boxWidth} height={boxHeight} fill="#020617" fillOpacity="0.75" stroke={stat.color} strokeWidth={0.4 * hudScale} rx={1 * hudScale} filter="url(#neonGlow)"/>
                    {/* Stacked Text */}
                    <text x={rectX + 2*hudScale} y={rectY + 4*hudScale} textAnchor="start" fill={stat.color} fontSize={2.2 * hudScale} className="font-black tracking-widest">{stat.label}</text>
                    <text x={rectX + 2*hudScale} y={rectY + 9.5*hudScale} textAnchor="start" fill="#f8fafc" fontSize={3.2 * hudScale} className="font-bold">{safeText(stat.value)}</text>
                  </g>
                );
              })}

            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>
      
      <Tooltip id="global-map-tooltip" className="!bg-slate-900/95 !border !border-slate-700 !rounded-md !z-50" />
    </div>
  );
}