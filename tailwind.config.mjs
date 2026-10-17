/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        ink: '#1A1A1A',
        muted: '#525252',
        sage: {
          DEFAULT: '#2C4A3E',
          hover: '#4A7C59',
          50: '#F1F5F2',
          100: '#E1EAE4',
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
