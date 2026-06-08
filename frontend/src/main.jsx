//src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { SearchModalProvider } from './context/SearchModalContext.jsx'

import { PresenceProvider } from './context/PresenceContext.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PresenceProvider>
        <SearchModalProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SearchModalProvider>
      </PresenceProvider>
    </AuthProvider>
  </StrictMode>
)
