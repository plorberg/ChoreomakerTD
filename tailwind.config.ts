import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        panel: '#14171c',
        border: '#242932',
        accent: '#7c5cff',
      },
    },
  },
  plugins: [],
};
export default config;
