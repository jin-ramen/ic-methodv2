import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#6B432E',
          colorBackground: '#3A2015',
          colorText: '#FFEDE8',
          colorTextSecondary: '#FFEDE880',
          colorInputBackground: '#4A2E1F',
          colorInputText: '#FFEDE8',
          borderRadius: '0.75rem',
          fontFamily: '"GFS Didot", serif',
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
