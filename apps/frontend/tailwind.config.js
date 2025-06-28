/**  @type {import('tailwindcss').Config}  */
export default {
  /* Paths to all template files */
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  /* Enable class-based dark mode (e.g. <html class="dark">) */
  darkMode: 'class',

  theme: {
    extend: {
      /* Basic brand palette – adjust to real design tokens later */
      colors: {
        primary: {
          DEFAULT: '#6366F1', // indigo-500
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F59E0B', // amber-500
          foreground: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },

  /* Register official plugins */
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

