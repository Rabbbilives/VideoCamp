import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: true
  }
})




// git init
// git add .
// git commit -m "Initial commit"
// git branch -M main
// git remote add origin https://github.com/your-username/your-repo-name.git
// git push -u origin main
