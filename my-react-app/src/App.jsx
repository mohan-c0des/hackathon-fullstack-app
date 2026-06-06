import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const TreasureMap = () => {
  return (
    <div
      style={{
        backgroundImage: "url('/parchment.jpg')", // parchment texture
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "100vw",   // full viewport width
        height: "100vh",  // full viewport height
        overflow: "hidden",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        width={980}   // wider map
        height={550}  // taller map
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => alert(`You clicked ${geo.properties.NAME}`)}
                  style={{
                    default: {
                      fill: "#d2b48c", // tan parchment fill
                      stroke: "#8b4513", // dark brown borders
                      outline: "none",
                    },
                    hover: {
                      fill: "#deb887",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "#cd853f",
                    },
                  }}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default TreasureMap;
