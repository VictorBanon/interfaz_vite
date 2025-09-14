import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PlotWindowProps {
  title: string
  data: number[]
}

const PlotWindow: React.FC<PlotWindowProps> = ({ title, data }) => {
  const chartData = {
    labels: Array.from({ length: data.length }, (_, i) => `Punto ${i + 1}`),
    datasets: [
      {
        label: title,
        data: data,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
  }

  return (
    <div>
      <h3>{title}</h3>
      {data.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <p>Selecciona una línea para ver el gráfico.</p>
      )}
    </div>
  )
}

export default PlotWindow