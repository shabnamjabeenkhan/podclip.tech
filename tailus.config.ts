import { palette, components } from "@tailus/themer";

export default {
  // Your chosen purple/pink theme colors
  palette: {
    primary: {
      50: '#f0f4ff',
      100: '#e5edff', 
      200: '#cddbfe',
      300: '#b4c6fc',
      400: '#8fadf7',
      500: '#6b7ff0', // Main purple
      600: '#4c63d2',
      700: '#3b4ba8',
      800: '#2d3748',
      900: '#1a202c',
      950: '#0f172a',
    },
    secondary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe', 
      300: '#f0abfc',
      400: '#e879f9', // Pink accent
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
      950: '#4a044e',
    }
  },
  // Dark theme configuration
  appearance: 'dark',
  components: {
    // Enable specific components you want to use
    button: true,
    card: true,
    badge: true,
    avatar: true,
    input: true,
    // Add more components as needed
  },
  // Customize border radius to match your design
  borderRadius: {
    xs: '0.125rem',
    sm: '0.25rem', 
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
  }
};