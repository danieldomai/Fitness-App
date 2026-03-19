import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import AppLoader from './components/AppLoader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLoader>
      <App />
    </AppLoader>
  </StrictMode>,
)
