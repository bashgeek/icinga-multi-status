/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/*.{js,css}","./inc/*.{js,css}","./*.html"],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
        'light',
        'dark'
    ],
    darkTheme: 'dark',
    logs: false,
  }
}
