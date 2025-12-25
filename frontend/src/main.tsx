import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Import augmented-ui for sci-fi clipped borders
import 'augmented-ui/augmented-ui.min.css'

// Import our God Mode design system
import './styles/god-mode-theme.css'

// Import the main App
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
