/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        'handwriting': ['Caveat', 'cursive'],
      },
      colors: {
        primary: {
          50: 'hsl(280 70% 95%)',
          100: 'hsl(280 70% 90%)',
          200: 'hsl(280 70% 80%)',
          300: 'hsl(280 70% 70%)',
          400: 'hsl(280 70% 60%)',
          500: 'hsl(280 70% 50%)',
          600: 'hsl(280 70% 40%)',
          700: 'hsl(280 70% 30%)',
          800: 'hsl(280 70% 20%)',
          900: 'hsl(280 70% 10%)',
        },
        accent: {
          50: 'hsl(45 85% 95%)',
          100: 'hsl(45 85% 90%)',
          200: 'hsl(45 85% 80%)',
          300: 'hsl(45 85% 70%)',
          400: 'hsl(45 85% 60%)',
          500: 'hsl(45 85% 50%)',
          600: 'hsl(45 85% 40%)',
          700: 'hsl(45 85% 30%)',
          800: 'hsl(45 85% 20%)',
          900: 'hsl(45 85% 10%)',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(2deg)' }
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0px) translateY(0px)' },
          '25%': { transform: 'translateX(5px) translateY(-5px)' },
          '75%': { transform: 'translateX(-5px) translateY(5px)' }
        }
      }
    },
  },
  plugins: [],
}