import { useState, useEffect } from 'react';
import Papa from 'papaparse';
// @ts-ignore
import Sidebar from '../../components/sidebar/Sidebar';
// @ts-ignore
import Heatmap from '../../components/structural/structural_plot';
// @ts-ignore
import GapPlot from '../../components/structural/gap_plot';
// @ts-ignore  
import ArmPlot from '../../components/structural/arm_plot';
// @ts-ignore
import TotalPlot from '../../components/structural/total_plot';
// @ts-ignore
import PercentualHeatmap from '../../components/structural/percentual_heatmap';
import './InterestingIndividuals.css';

interface Individual {
  id: string
  superkingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  species: string
}

interface InterestingIndividualsProps {
  filterTerm?: string
  onIndividualFilterChange?: (filterTerm: string) => void
}

const InterestingIndividuals = ({ filterTerm = '', onIndividualFilterChange }: InterestingIndividualsProps) => {
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: Set<string> }>({})
  const [markdownContent, setMarkdownContent] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({})
  const part = "all"
  
  // Sidebar state
  const [taxon, setTaxon] = useState("Superdomain")
  const [taxonValue, setTaxonValue] = useState("Prokaryote")

  // Sidebar handlers
  const handlePartChange = () => {}
  const handlePCChange = () => {}
  const handleAggregateChange = () => {}
  const handleTaxonChange = (newTaxon: string) => {
    setTaxon(newTaxon)
  }
  const handleTaxonValueChange = (newTaxonValue: string) => {
    setTaxonValue(newTaxonValue)
  }
  const handleMaxPCChange = () => {}
  const handleSelectedPCsChange = () => {}
  const handleGroupByChange = () => {}
  const handleTaxonomyPlotChange = () => {}
  const handleFilterChange = () => {}
  const handleIndividualFilterChange = (filterTerm: string) => {
    if (onIndividualFilterChange) {
      onIndividualFilterChange(filterTerm)
    }
  }

  useEffect(() => {
    const loadInterestingIndividuals = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/data/interesting_individuals.csv')
        if (!response.ok) {
          throw new Error(`Failed to fetch interesting individuals data: ${response.status}`)
        }
        
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            console.log('Interesting individuals loaded:', result.data)
            const data = result.data as Individual[]
            setIndividuals(data)
            
            // Inicializar tabs activos para cada individuo
            const initialTabs: { [key: string]: string } = {}
            data.forEach(individual => {
              initialTabs[individual.id] = 'gap/arm'
              // Load markdown content for each individual
              loadMarkdownContent(individual.id)
            })
            setActiveTab(initialTabs)
            
            setLoading(false)
          },
          error: (err: Error) => {
            console.error('Error parsing interesting individuals CSV:', err)
            setError(`Error parsing CSV: ${err.message}`)
            setLoading(false)
          }
        })
      } catch (err) {
        console.error('Error loading interesting individuals:', err)
        setError(`Error loading data: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    loadInterestingIndividuals()
  }, [])

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSection = (individualId: string, section: string) => {
    setExpandedSections(prev => {
      const individualSections = prev[individualId] || new Set()
      const newSections = new Set(individualSections)
      
      if (newSections.has(section)) {
        newSections.delete(section)
      } else {
        newSections.add(section)
      }
      
      return {
        ...prev,
        [individualId]: newSections
      }
    })
  }

  const loadMarkdownContent = async (individualId: string) => {
    try {
      const response = await fetch(`/data/${individualId}/info.md`)
      if (response.ok) {
        const content = await response.text()
        setMarkdownContent(prev => ({
          ...prev,
          [individualId]: content
        }))
      }
    } catch (error) {
      console.log(`No info.md found for ${individualId}`)
    }
  }

  const handleTabChange = (id: string, tabName: string) => {
    setActiveTab(prev => ({
      ...prev,
      [id]: tabName
    }))
  }

  const getTaxonomyString = (individual: Individual) => {
    return `${individual.superkingdom} > ${individual.phylum} > ${individual.class} > ${individual.order} > ${individual.family} > ${individual.genus} > ${individual.species}`
  }

  const renderMarkdown = (content: string) => {
    // Simple markdown renderer for basic formatting
    return content
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\*\*(.*)\*\*/gm, '<strong>$1</strong>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
  }

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar 
          onPartChange={handlePartChange}
          onPCChange={handlePCChange}
          onAggregateChange={handleAggregateChange}
          onTaxonChange={handleTaxonChange}
          onTaxonValueChange={handleTaxonValueChange}
          onMaxPCChange={handleMaxPCChange}
          onSelectedPCsChange={handleSelectedPCsChange}
          onGroupByChange={handleGroupByChange}
          onTaxonomyPlotChange={handleTaxonomyPlotChange}
          onFilterChange={handleFilterChange}
          onIndividualFilterChange={handleIndividualFilterChange}
          taxon={taxon}
          taxonValue={taxonValue}
        />
        <main className="main-content scrollable-content">
          <div className="interesting-individuals">
            <div className="loading">
              <h2>Loading interesting individuals...</h2>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <Sidebar 
          onPartChange={handlePartChange}
          onPCChange={handlePCChange}
          onAggregateChange={handleAggregateChange}
          onTaxonChange={handleTaxonChange}
          onTaxonValueChange={handleTaxonValueChange}
          onMaxPCChange={handleMaxPCChange}
          onSelectedPCsChange={handleSelectedPCsChange}
          onGroupByChange={handleGroupByChange}
          onTaxonomyPlotChange={handleTaxonomyPlotChange}
          onFilterChange={handleFilterChange}
          onIndividualFilterChange={handleIndividualFilterChange}
          taxon={taxon}
          taxonValue={taxonValue}
        />
        <main className="main-content scrollable-content">
          <div className="interesting-individuals">
            <div className="error">
              <h2>Error loading interesting individuals</h2>
              <p>{error}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Filter individuals based on search term
  const filteredIndividuals = individuals.filter(individual => {
    if (!filterTerm.trim()) return true
    
    const searchTerm = filterTerm.toLowerCase()
    return (
      individual.id.toLowerCase().includes(searchTerm) ||
      individual.genus.toLowerCase().includes(searchTerm) ||
      individual.species.toLowerCase().includes(searchTerm) ||
      `${individual.genus} ${individual.species}`.toLowerCase().includes(searchTerm) ||
      individual.phylum.toLowerCase().includes(searchTerm) ||
      individual.class.toLowerCase().includes(searchTerm) ||
      individual.order.toLowerCase().includes(searchTerm) ||
      individual.family.toLowerCase().includes(searchTerm)
    )
  })

  return (
    <div className="dashboard">
      <Sidebar 
        onPartChange={handlePartChange}
        onPCChange={handlePCChange}
        onAggregateChange={handleAggregateChange}
        onTaxonChange={handleTaxonChange}
        onTaxonValueChange={handleTaxonValueChange}
        onMaxPCChange={handleMaxPCChange}
        onSelectedPCsChange={handleSelectedPCsChange}
        onGroupByChange={handleGroupByChange}
        onTaxonomyPlotChange={handleTaxonomyPlotChange}
        onFilterChange={handleFilterChange}
        onIndividualFilterChange={handleIndividualFilterChange}
        taxon={taxon}
        taxonValue={taxonValue}
      />
      <main className="main-content scrollable-content">
        <div className="interesting-individuals">
          <h1>Interesting Individuals</h1>
          <p className="description">
            This page shows a curated list of interesting genomic individuals with their structural analysis plots.
            {filterTerm && (
              <span style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: '#3498db', 
                fontWeight: 'bold',
                fontSize: '0.9em'
              }}>
                Showing {filteredIndividuals.length} of {individuals.length} individuals matching "{filterTerm}"
              </span>
            )}
          </p>
          
          <div className="individuals-list">
            {filteredIndividuals.length === 0 ? (
              <div className="no-data">
                {filterTerm ? (
                  <>
                    <h3>No individuals found</h3>
                    <p>No organisms match the search term "{filterTerm}". Try a different search or clear the filter.</p>
                  </>
                ) : (
                  <>
                    <h3>No individuals available</h3>
                    <p>No interesting individuals data found.</p>
                  </>
                )}
              </div>
            ) : (
              filteredIndividuals.map((individual) => (
              <div key={individual.id} className="individual-item">
                <div 
                  className="individual-header" 
                  onClick={() => toggleExpanded(individual.id)}
                >
                  <div className="header-content">
                    <div className="header-main">
                      <span className="expand-icon">
                        {expandedItems.has(individual.id) ? '▼' : '▶'}
                      </span>
                      <span className="individual-name">{individual.genus} {individual.species}</span>
                      <span className="individual-id">{individual.id}</span>
                    </div>
                    <div className="taxonomy-info">
                      {getTaxonomyString(individual)}
                    </div>
                  </div>
                </div>
                
                {expandedItems.has(individual.id) && (
                  <div className="individual-content">
                    {/* Info Section */}
                    {markdownContent[individual.id] && (
                      <div className="collapsible-section">
                        <div 
                          className="section-header" 
                          onClick={() => toggleSection(individual.id, 'info')}
                        >
                          <span className="section-icon">
                            {expandedSections[individual.id]?.has('info') ? '▼' : '▶'}
                          </span>
                          <span className="section-title">Info</span>
                        </div>
                        {expandedSections[individual.id]?.has('info') && (
                          <div className="section-content">
                            <div className="markdown-content">
                              <div 
                                dangerouslySetInnerHTML={{ 
                                  __html: `<p>${renderMarkdown(markdownContent[individual.id])}</p>` 
                                }} 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Structural Section */}
                    <div className="collapsible-section">
                      <div 
                        className="section-header" 
                        onClick={() => toggleSection(individual.id, 'structural')}
                      >
                        <span className="section-icon">
                          {expandedSections[individual.id]?.has('structural') ? '▼' : '▶'}
                        </span>
                        <span className="section-title">Structural Analysis</span>
                      </div>
                      {expandedSections[individual.id]?.has('structural') && (
                        <div className="section-content">
                          <div className="individual-plots">
                            <div className="plots-tabs">
                              <div className="tabs-header">
                                {["gap/arm", "gap", "arm", "total", "percentual"].map((tab) => (
                                  <button
                                    key={tab}
                                    className={`tab-button ${activeTab[individual.id] === tab ? "active" : ""}`}
                                    onClick={() => handleTabChange(individual.id, tab)}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                              <div className="tab-content">
                                {activeTab[individual.id] === "gap/arm" && (
                                  <Heatmap 
                                    id={individual.id}
                                    idReplicon={`chromosome_${individual.id}`} 
                                    name={`${individual.genus} ${individual.species}`} 
                                    part={part} 
                                  />
                                )}
                                {activeTab[individual.id] === "gap" && (
                                  <GapPlot 
                                    id={individual.id} 
                                    idReplicon={`chromosome_${individual.id}`} 
                                    name={`${individual.genus} ${individual.species}`} 
                                    part={part} 
                                  />
                                )}
                                {activeTab[individual.id] === "arm" && (
                                  <ArmPlot 
                                    id={individual.id} 
                                    idReplicon={`chromosome_${individual.id}`} 
                                    name={`${individual.genus} ${individual.species}`} 
                                    part={part} 
                                  />
                                )}
                                {activeTab[individual.id] === "total" && (
                                  <TotalPlot 
                                    id={individual.id} 
                                    idReplicon={`chromosome_${individual.id}`} 
                                    part={part} 
                                  />
                                )}
                                {activeTab[individual.id] === "percentual" && (
                                  <PercentualHeatmap 
                                    id={individual.id} 
                                    idReplicon={`chromosome_${individual.id}`} 
                                    name={`${individual.genus} ${individual.species}`} 
                                    part={part} 
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default InterestingIndividuals