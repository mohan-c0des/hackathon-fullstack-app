import React from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import { geoCentroid, geoArea } from "d3-geo";
import geoUrl from "../countries-110m.json";

export default function MapDisplay({ state, dispatch, geoFeatures, setGeoFeatures, triggerCountryFocus }) {
  
  const handleMapCountryClick = (countryName) => {
    triggerCountryFocus(countryName);
    dispatch({ type: "START_BRIEFING" });
  };

  return (
    <div className={`
      transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative
      ${state.isCanvasExpanded ? "h-0 flex-none opacity-0 overflow-hidden pointer-events-none" : "flex-1 min-h-[50%]"}
      ${state.isAutoZooming ? "[&_g]:transition-transform [&_g]:duration-1500 [&_g]:ease-[cubic-bezier(0.34,1.56,0.64,1)]" : ""}
    `}>
      <ComposableMap projection="geoMercator" viewBox="0 0 800 450" className="w-full h-full">
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
                      className="outline-none"
                      style={{
                        default: { fill: isSelected ? "#1b5949" : "#dbb086a9", stroke: isSelected ? "#ffffffad" : "#0a0909", strokeWidth: 1 },
                        hover: { fill: isSelected ? "#422c0b" : "#895a2aa9", stroke: "#062e21", strokeWidth: 2, cursor: "pointer" },
                        pressed: { fill: "#820c0c" }
                      }}
                    />
                    {showLabel && centroid[0] && centroid[1] && (
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
        </ZoomableGroup>
      </ComposableMap>
      
      <Tooltip id="global-map-tooltip" className="!bg-slate-900/95 !border !border-slate-700 !rounded-md !z-50" />
    </div>
  );
}