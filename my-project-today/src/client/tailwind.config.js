module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b3ff',
          400: '#3399ff',
          500: '#0078d4',
          600: '#0066b3',
          700: '#004d87',
          800: '#00335a',
          900: '#001a2e',
        },
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.6' }],
        sm: ['0.9375rem', { lineHeight: '1.6' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.5' }],
        xl: ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.35' }],
        '3xl': ['1.75rem', { lineHeight: '1.3' }],
        '4xl': ['2rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
