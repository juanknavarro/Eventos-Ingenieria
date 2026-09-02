import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B305B',
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C2D3E7',
          300: '#94B4D6',
          400: '#5C8EC0',
          500: '#0B305B',
          600: '#09274A',
          700: '#071F3B',
          800: '#05172C',
          900: '#04101E',
          950: '#020912',
        },
        accent: {
          DEFAULT: '#D2202E',
          50: '#FDF2F3',
          100: '#FBE5E7',
          200: '#F6CDD1',
          300: '#EFA4AB',
          400: '#E46E79',
          500: '#D2202E',
          600: '#B01824',
          700: '#93121C',
          800: '#7B121A',
          900: '#68131A',
          950: '#3C0509',
        },
      },
    },
  },
  plugins: [],
}

export default config

