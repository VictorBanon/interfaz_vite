import React, { useState, useEffect } from "react"
import Plot from "react-plotly.js"
import Papa from "papaparse"

const ACP = ({ csvPath, pcNumber }) => {
  const [data, setData] = useState([])

  useEffect(() => {
    Papa.parse(csvPath, {
      header: true,
      download: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filtered = results.data.filter(row => row && Object.keys(row).length > 0)
        setData(filtered)
      },
      error: (err) => console.error("CSV parsing error:", err)
    })
  }, [csvPath])

  if (data.length === 0) return <p>Loading...</p>

  // Group rows by color
  const colorGroups = {}
  data.forEach((row) => {
    const color = row.color || "Unknown"
    if (!colorGroups[color]) colorGroups[color] = []
    colorGroups[color].push(row)
  })

  // Create one trace per color
  const traces = Object.entries(colorGroups).map(([color, rows]) => ({
    x: rows.map((row) => row[`PC${pcNumber}`] ?? 0),
    y: rows.map((row) => row.PC1 ?? 0),
    text: rows.map((row) => row.fullname || ""),
    hovertext: rows.map(
      (row) => `ID: ${row.ID || "N/A"}<br>Fullname: ${row.fullname || "N/A"}`
    ),
    mode: "markers",
    type: "scatter",
    name: color, // legend
    marker: {
      symbol: rows.map((row) => {
        const id = row.ID || ""
        return id.toLowerCase().includes("plasmid") ? "triangle-up" : "circle"
      }),
      size: 10
      // no explicit color, let Plotly assign automatically
    }
  }))

  return (
    <Plot
      data={traces}
      layout={{
        title: `Scatter plot PC1 vs PC${pcNumber}`,
        xaxis: { title: `PC${pcNumber}` },
        yaxis: { title: "PC1" },
        hovermode: "closest",
        autosize: true,
        legend: { title: { text: "Color / Taxonomy" } }
      }}
      style={{ width: "100%", height: "100%" }}
      config={{ responsive: true }}
    />
  )
}

export default ACP
