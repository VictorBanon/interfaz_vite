import { defineConfig } from 'vite'
import Checker from 'vite-plugin-checker'

export default defineConfig({
  base: './', // rutas relativas para que funcione con doble clic
  plugins: [
    Checker({ typescript: true }) // type checking en desarrollo
  ],
  server: {
    watch: {
      ignored: [
        '**/public/data/**',
        '**/data/**',
        '**/*.csv',
        '**/*.fna'
      ] // Excluir directorios de datos del file watching
    }
  }
})
