import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './estilo.css'
import { guardarConviteDoLink } from './lib/assinatura'

guardarConviteDoLink()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js')
}
