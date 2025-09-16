
import React, { useState, useEffect } from 'react'

interface WikipediaViewerProps {
  searchTerm: string | null
}

const WikipediaViewer: React.FC<WikipediaViewerProps> = ({ searchTerm }) => {
  const [wikiData, setWikiData] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="wikipedia-viewer">
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {wikiData && (
        <div className="wiki-content">
          <h3>{searchTerm}</h3>
          <p>{wikiData}</p>
        </div>
      )}
    </div>
  )
}

export default WikipediaViewer