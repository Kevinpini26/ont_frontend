import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Polices auto-hébergées (@fontsource, pas de CDN externe) : Inter Variable
// pour le corps de texte (une seule fabrique woff2 couvrant les graisses
// 100-900, contre 4 fichiers statiques auparavant), Poppins pour les titres,
// en 600/700 uniquement — voir --font-sans/--font-heading dans index.css.
//
// @fontsource-variable/inter n'expose pas de fichier "latin.css" dédié :
// wght.css déclare plusieurs @font-face avec unicode-range (latin,
// latin-ext, cyrillique, grec...), mais grâce à unicode-range le navigateur
// ne télécharge réellement que la fabrique correspondant aux caractères
// présents sur la page — en français, seulement inter-latin-wght-normal.woff2.
// C'est le même principe qui faisait partir à tort le devanagari de Poppins
// dans le bundle : Poppins, lui, n'est PAS une police variable et n'a pas de
// unicode-range par défaut sur ses fichiers 600.css/700.css (chaque graisse
// est un fichier statique par écriture) — d'où l'usage explicite de
// latin-600.css/latin-700.css ci-dessous, qui évite réellement le
// téléchargement des autres écritures.
import '@fontsource-variable/inter/wght.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
