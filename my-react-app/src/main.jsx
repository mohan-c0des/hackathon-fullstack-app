import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import BriefingDashboard from './Phase-one_Frontend/HomePage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>  {/* <-- 2. Wrap your App in it */}
      <BriefingDashboard />
    </BrowserRouter>
  </React.StrictMode>,
)