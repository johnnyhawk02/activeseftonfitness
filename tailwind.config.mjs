/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        ink: '#1A1A1A',
        muted: '#525252',
        // Active Sefton logo colours: wordmark blue, mark blue, the red dot.
        brand: {
          DEFAULT: '#055BAD',
          hover: '#044A8D',
          sky: '#0280BA',
          red: '#E8000B',
          50: '#EEF4FB',
          100: '#DCE8F6',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,26,26,0.04), 0 4px 16px rgba(26,26,26,0.04)',
      },
    },
  },
};
