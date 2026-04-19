/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF2',
        sun: '#FFD84D',
        coral: '#FF6B5B',
        ocean: '#4ECDC4',
        navy: '#1F2E4D',
        peach: '#FFB3BA',
        grass: '#7DD87A',
        sky: '#A5E3F5',
        berry: '#E85A9A'
      },
      fontFamily: {
        display: ['"M PLUS Rounded 1c"', 'sans-serif'],
        accent: ['"Archivo Black"', 'sans-serif'],
        fun: ['"Fredoka"', 'sans-serif'],
        hand: ['"Caveat"', 'cursive']
      },
      borderRadius: {
        'blob': '48% 52% 62% 38% / 52% 42% 58% 48%',
        'button': '999px'
      }
    }
  },
  plugins: [],
}