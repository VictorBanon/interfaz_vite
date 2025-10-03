import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom' 
import Structural from './pages/structural/Structural'
import Kmer from './pages/kmer/Kmer' 
import Introduction from './pages/introduction/Introduction' 
import Taxonomy from './pages/taxonomy/Taxonomy' 
import Spatial from './pages/spatial/Spatial' 
import Compositional from './pages/compositional/Compositional'
import Motif from './pages/motif/Motif' 

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Introduction />} />   {/* 👈 add this */}
        <Route path="/introduction" element={<Introduction />} />
        <Route path="/taxonomy" element={<Taxonomy />} />
        <Route path="/structural" element={<Structural />} />
        <Route path="/kmer" element={<Kmer />} />
        <Route path="/spatial" element={<Spatial />} />
        <Route path="/compositional" element={<Compositional />} />
        <Route path="/motif" element={<Motif />} />
      </Routes> 
    </Router>
  )
}

export default App

