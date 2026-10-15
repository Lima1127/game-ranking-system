/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Titulos com cara de jogo (usado no Bem-vindo do Menu)
        display: ['Fredoka', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
      }
    },
  },
  plugins: [],
}
