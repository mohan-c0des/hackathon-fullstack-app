import { useState } from 'react'

function App() {
  // 1. Setup State Variables
  const [selectedCountry, setSelectedCountry] = useState("India") // Default to India
  const [briefingData, setBriefingData] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 2. The function that runs when the button is clicked
  const handleGenerateBriefing = async () => {
    setIsLoading(true) // Turn on the loading state
    setBriefingData("") // Clear any old briefings

    try {
      // 3. The Fetch Call to FastAPI
      const response = await fetch("http://127.0.0.1:8000/api/briefing", {
        method: "POST", // Must match the @app.post in FastAPI
        headers: {
          "Content-Type": "application/json",
        },
        // We stringify the data to match the Pydantic 'CountryRequest' model
        body: JSON.stringify({ country: selectedCountry }), 
      });

      const data = await response.json();
      
      // 4. Update the screen with the AI's response
      setBriefingData(data.briefing);

    } catch (error) {
      console.error("Error fetching data:", error);
      setBriefingData("Failed to connect to the AI agent.");
    } finally {
      setIsLoading(false) // Turn off the loading state regardless of success/fail
    }
  }

  // 5. The UI (Dropdown, Button, and Result Area)
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>Global AI Intelligence</h1>
      
      {/* Dropdown Input */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "1rem" }}>Select Target Country:</label>
        <select 
          value={selectedCountry} 
          onChange={(e) => setSelectedCountry(e.target.value)}
          style={{ padding: "0.5rem" }}
        >
          <option value="India">India</option>
          <option value="Japan">Japan</option>
          <option value="Germany">Germany</option>
          <option value="Brazil">Brazil</option>
        </select>
      </div>

      {/* Trigger Button */}
      <button 
        onClick={handleGenerateBriefing} 
        disabled={isLoading} // Prevent spam-clicking while loading
        style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
      >
        {isLoading ? "Compiling Briefing..." : "Generate Briefing"}
      </button>

      {/* Display the Results */}
      <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", minHeight: "100px" }}>
        {isLoading ? (
          <p style={{ color: "gray", fontStyle: "italic" }}>Agent is researching {selectedCountry}...</p>
        ) : (
          <p>{briefingData || "Select a country to begin."}</p>
        )}
      </div>
    </div>
  )
}

export default App