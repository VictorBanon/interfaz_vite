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
  'ID-replicon': string
  full_name: string
  Superdomain: string
  Domain: string
  Phylum: string
  Class: string
  Order: string
  Family: string
  Genus: string
  Species: string
}

const InterestingIndividuals = () => {
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({})
  const part = "all"
  
  // Sidebar state
  const [taxon, setTaxon] = useState("Superdomain")
  const [taxonValue, setTaxonValue] = useState("Prokaryote")

  // Sidebar handlers (empty since we don't need them for this page)
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
              initialTabs[individual['ID-replicon']] = 'gap/arm'
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

  const toggleExpanded = (idReplicon: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(idReplicon)) {
        newSet.delete(idReplicon)
      } else {
        newSet.add(idReplicon)
      }
      return newSet
    })
  }

  const handleTabChange = (idReplicon: string, tabName: string) => {
    setActiveTab(prev => ({
      ...prev,
      [idReplicon]: tabName
    }))
  }

  const getTaxonomyString = (individual: Individual) => {
    return `${individual.Domain} > ${individual.Phylum} > ${individual.Class} > ${individual.Order} > ${individual.Family} > ${individual.Genus} > ${individual.Species}`
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
        taxon={taxon}
        taxonValue={taxonValue}
      />
      <main className="main-content scrollable-content">
        <div className="interesting-individuals">
          <h1>Interesting Individuals</h1>
          <p className="description">
            This page shows a curated list of interesting genomic individuals with their structural analysis plots.
          </p>
          
          <div className="individuals-list">
            {individuals.map((individual) => (
              <div key={individual['ID-replicon']} className="individual-item">
                <div 
                  className="individual-header" 
                  onClick={() => toggleExpanded(individual['ID-replicon'])}
                >
                  <div className="header-content">
                    <div className="header-main">
                      <span className="expand-icon">
                        {expandedItems.has(individual['ID-replicon']) ? '▼' : '▶'}
                      </span>
                      <span className="individual-id">{individual['ID-replicon']}</span>
                      <span className="individual-name">{individual.full_name}</span>
                    </div>
                    <div className="taxonomy-info">
                      {getTaxonomyString(individual)}
                    </div>
                  </div>
                </div>
                
                {expandedItems.has(individual['ID-replicon']) && (
                  <div className="individual-plots">
                    <div className="plots-tabs">
                      <div className="tabs-header">
                        {["gap/arm", "gap", "arm", "total", "percentual"].map((tab) => (
                          <button
                            key={tab}
                            className={`tab-button ${activeTab[individual['ID-replicon']] === tab ? "active" : ""}`}
                            onClick={() => handleTabChange(individual['ID-replicon'], tab)}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <div className="tab-content">
                        {activeTab[individual['ID-replicon']] === "gap/arm" && (
                          <Heatmap 
                            id={individual['ID-replicon'].split('_')[1]} // Extraer ID
                            idReplicon={individual['ID-replicon']} 
                            name={individual.full_name} 
                            part={part} 
                          />
                        )}
                        {activeTab[individual['ID-replicon']] === "gap" && (
                          <GapPlot 
                            id={individual['ID-replicon'].split('_')[1]} 
                            idReplicon={individual['ID-replicon']} 
                            name={individual.full_name} 
                            part={part} 
                          />
                        )}
                        {activeTab[individual['ID-replicon']] === "arm" && (
                          <ArmPlot 
                            id={individual['ID-replicon'].split('_')[1]} 
                            idReplicon={individual['ID-replicon']} 
                            name={individual.full_name} 
                            part={part} 
                          />
                        )}
                        {activeTab[individual['ID-replicon']] === "total" && (
                          <TotalPlot 
                            id={individual['ID-replicon'].split('_')[1]} 
                            idReplicon={individual['ID-replicon']} 
                            part={part} 
                          />
                        )}
                        {activeTab[individual['ID-replicon']] === "percentual" && (
                          <PercentualHeatmap 
                            id={individual['ID-replicon'].split('_')[1]} 
                            idReplicon={individual['ID-replicon']} 
                            name={individual.full_name} 
                            part={part} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default InterestingIndividuals