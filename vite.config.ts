import { defineConfig } from 'vite'
import Checker from 'vite-plugin-checker'

export default defineConfig({
  base: './', // rutas relativas para que funcione con doble clic
  plugins: [
    Checker({ typescript: true }) // type checking en desarrollo
  ]
})
