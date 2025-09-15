import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom' 
import Structural from './pages/Structural'
import Kmer from './pages/Kmer' 
import Introduction from './pages/Introduction' 
import Taxonomy from './pages/Taxonomy' 
import Spatial from './pages/Spatial' 
import Compositional from './pages/Compositional' 

const App = () => {
  return (
    <Router>
      <Routes> 
        <Route path="/introduction" element={<Introduction />} />
        <Route path="/taxonomy" element={<Taxonomy />} />
        <Route path="/structural" element={<Structural />} />
        <Route path="/kmer" element={<Kmer />} />
        <Route path="/spatial" element={<Spatial />} />
        <Route path="/compositional" element={<Compositional />} /> 
      </Routes>
    </Router>
  )
}

export default App

