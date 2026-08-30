tailwind.config = {
  theme: {
    extend: {
      colors: {
        cream: { 100: '#FAF8F3', 200: '#F2EEE3', 300: '#E6E0D0', 400: '#D3CAB0' },
        ink: '#211F1A',
        'ink-soft': '#7A7566',
        'ink-muted': '#4B473C',
        indigo: { DEFAULT: '#8B5CF6', 50: '#F5F3FF', 100: '#EDE9FE' }
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      maxWidth: { wide: '1180px' }
    }
  }
}
