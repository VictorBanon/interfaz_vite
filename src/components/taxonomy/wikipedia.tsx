
import React, { useState, useEffect } from 'react'

interface WikipediaViewerProps {
  searchTerm: string | null
  scale?: number
}

const WikipediaViewer: React.FC<WikipediaViewerProps> = ({ searchTerm, scale = 1 }) => {
  const [wikiData, setWikiData] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const openWikipediaPage = () => {
    if (searchTerm) {
      const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm)}`
      window.open(wikipediaUrl, '_blank')
    }
  }

  useEffect(() => {
    if (!searchTerm) return

    const fetchWikiData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
        )
        
        if (!response.ok) {
          throw new Error('No data on taxon.')
        }

        const data = await response.json()
        setWikiData(data.extract)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al buscar en Wikipedia')
      } finally {
        setLoading(false)
      }
    }

    fetchWikiData()
  }, [searchTerm])

  return (
    <div 
      className="wikipedia-viewer"
      style={{
        fontSize: `${1 / scale}rem`
      }}
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {wikiData && (
        <div className="wiki-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: `${1.5 / scale}rem` }}>{searchTerm}</h3>
            <button
              onClick={openWikipediaPage}
              style={{
                background: '#0066cc',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: `${0.9 / scale}rem`,
                textDecoration: 'none'
              }}
              title="Abrir artículo completo en Wikipedia"
            >
              Ver en Wikipedia
            </button>
          </div>
          <p style={{ fontSize: `${1 / scale}rem`, lineHeight: 1.6 }}>{wikiData}</p>
        </div>
      )}
    </div>
  )
}

export default WikipediaViewer