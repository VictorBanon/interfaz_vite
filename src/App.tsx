import { BrowserRouter as Router, Routes, Route } from 'react-router-dom' 
import Structural from './pages/structural/Structural.jsx'
import Kmer from './pages/kmer/Kmer.jsx'  
import Taxonomy from './pages/taxonomy/Taxonomy.jsx' 
import Spatial from './pages/spatial/Spatial.jsx' 
import Compositional from './pages/compositional/Compositional.jsx'
import Motif from './pages/motif/Motif.jsx'
import Errors from './pages/errors/Errors.tsx' 
import InterestingIndividualsWrapper from './pages/interesting-individuals/InterestingIndividualsWrapper.tsx' 

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Structural />} />   
        <Route path="/taxonomy" element={<Taxonomy />} />
        <Route path="/structural" element={<Structural />} />
        <Route path="/kmer" element={<Kmer />} />
        <Route path="/spatial" element={<Spatial />} />
        <Route path="/compositional" element={<Compositional />} />
        <Route path="/motif" element={<Motif />} />
        <Route path="/errors" element={<Errors />} />
        <Route path="/interesting-individuals" element={<InterestingIndividualsWrapper />} />
      </Routes> 
    </Router>
  )
}

export default App

