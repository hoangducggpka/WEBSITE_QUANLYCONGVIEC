import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { SearchModalProvider } from './context/SearchModalContext.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SearchModalProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SearchModalProvider>
    </AuthProvider>
  </StrictMode>
)
