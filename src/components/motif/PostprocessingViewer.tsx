import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface PostprocessingData {
  [key: string]: string;
}

interface PostprocessingViewerProps {
  selectedOrganism?: any;
}

const PostprocessingViewer: React.FC<PostprocessingViewerProps> = ({ selectedOrganism }) => {
  const [data, setData] = useState<PostprocessingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    // Comentado para no cargar automáticamente el archivo
    /*
    if (!selectedOrganism || !selectedOrganism['ID-replicon']) {
      setData([]);
      setHeaders([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const loadPostprocessingData = async () => {
      try {
        const repliconId = selectedOrganism['ID-replicon'];
        const csvPath = `/data/${selectedOrganism.ID}/postprocessing/${repliconId}_postprocessing.csv`;
        
        console.log('Cargando archivo postprocessing:', csvPath);

        const response = await fetch(csvPath);
        
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        
        Papa.parse<PostprocessingData>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            console.log('Datos de postprocessing cargados:', result.data.length, 'filas');
            
            if (result.data.length > 0) {
              const firstRow = result.data[0];
              const csvHeaders = Object.keys(firstRow);
              setHeaders(csvHeaders);
              setData(result.data);
              console.log('Headers encontrados:', csvHeaders);
            } else {
              setError('El archivo está vacío o no tiene datos válidos');
            }
            
            setLoading(false);
          },
          error: (parseError) => {
            console.error('Error parseando CSV:', parseError);
            setError(`Error parseando el archivo: ${parseError.message}`);
            setLoading(false);
          }
        });

      } catch (err) {
        console.error('Error cargando postprocessing:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      }
    };

    loadPostprocessingData();
    */
  }, [selectedOrganism]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        color: '#666'
      }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>Cargando datos de postprocessing...</div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>
            {selectedOrganism?.genus} {selectedOrganism?.species}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        color: '#856404',
        border: '1px solid #ffeaa7',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Error cargando postprocessing</div>
          <div style={{ fontSize: '0.9rem' }}>{error}</div>
          {selectedOrganism && (
            <div style={{ fontSize: '0.8rem', marginTop: '10px', color: '#666' }}>
              Organismo: {selectedOrganism.genus} {selectedOrganism.species} ({selectedOrganism.ID})
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedOrganism) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        color: '#6c757d',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '5px' }}>📊 Postprocessing Data</div>
          <div>Selecciona un organismo en la tabla para ver los datos de postprocessing</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        color: '#6c757d'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Sin datos disponibles</div>
          <div>No se encontraron datos de postprocessing para este organismo</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
            {selectedOrganism.genus} {selectedOrganism.species} ({selectedOrganism.ID})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px' }}>
          📊 Postprocessing Data
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
          <em>{selectedOrganism.genus} {selectedOrganism.species}</em> ({selectedOrganism.ID}) • {data.length} entradas
        </div>
      </div>

      {/* Table */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        border: '1px solid #dee2e6',
        borderTop: 'none'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '0.8rem'
        }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#e9ecef', zIndex: 1 }}>
            <tr>
              {headers.map((header, index) => (
                <th key={index} style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  fontWeight: '600',
                  color: '#495057',
                  backgroundColor: '#e9ecef'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} style={{
                backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa'
              }}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex} style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #dee2e6'
                  }}>
                    {row[header] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PostprocessingViewer;