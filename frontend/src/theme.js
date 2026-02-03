import { createTheme, alpha } from '@mui/material/styles';

// Fluid Motion Color Palette - Premium Dark
const palette = {
  mode: 'dark',
  primary: {
    main: '#2dd4bf', // Teal-400 - Fresh & Modern
    light: '#5eead4',
    dark: '#14b8a6',
    contrastText: '#0f172a',
  },
  secondary: {
    main: '#818cf8', // Indigo-400 - Soft contrast
    light: '#a5b4fc',
    dark: '#6366f1',
    contrastText: '#ffffff',
  },
  error: {
    main: '#fb7185', // Rose-400
    light: '#fda4af',
    dark: '#e11d48',
  },
  warning: {
    main: '#fbbf24', // Amber-400
    light: '#fcd34d',
    dark: '#d97706',
  },
  info: {
    main: '#38bdf8', // Sky-400
    light: '#7dd3fc',
    dark: '#0284c7',
  },
  success: {
    main: '#34d399', // Emerald-400
    light: '#6ee7b7',
    dark: '#059669',
  },
  background: {
    default: '#0f172a', // Slate-900 (Deeper)
    paper: '#1e293b',   // Slate-800
    subtle: '#334155',  // Slate-700
  },
  text: {
    primary: '#f8fafc', // Slate-50
    secondary: '#94a3b8', // Slate-400
    disabled: '#475569',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    hover: 'rgba(255, 255, 255, 0.04)',
    selected: 'rgba(255, 255, 255, 0.08)',
  }
};

const typography = {
  fontFamily: [
    'Plus Jakarta Sans', // Premium Modern Sans
    'Inter',
    'sans-serif',
  ].join(','),
  h1: { fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.03em', lineHeight: 1.2 },
  h2: { fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.3 },
  h3: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em', lineHeight: 1.4 },
  h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' },
  h5: { fontWeight: 600, fontSize: '1.25rem' },
  h6: { fontWeight: 600, fontSize: '1rem' },
  button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  subtitle1: { fontWeight: 500, letterSpacing: '0.01em' },
  subtitle2: { fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.01em' },
  body1: { fontSize: '1rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.6 },
};

const theme = createTheme({
  palette,
  typography,
  shape: {
    borderRadius: 16, // Consistent rounded corners (user asked for 12-16)
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)', // 1
    '0px 4px 8px rgba(0,0,0,0.1)',  // 2
    '0px 8px 16px rgba(0,0,0,0.1)', // 3
    '0px 12px 24px rgba(0,0,0,0.1)', // 4 (Card hover)
    '0px 16px 32px rgba(0,0,0,0.1)', // 5
    '0px 24px 48px rgba(0,0,0,0.1)', // 6
    ...Array(18).fill('none') // Fill rest
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12, // User asked for 12-16 unified
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          boxShadow: '0 4px 14px 0 rgba(45, 212, 191, 0.39)', // Matching primary TEAL glow
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px rgba(45, 212, 191, 0.23)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 1) 100%)', // Subtle gradient
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        }
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(15, 23, 42, 0.8)', // Slate-900 /w transparency
          backdropFilter: 'blur(16px)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(30, 41, 59, 0.4)', // Slightly lighter input bg
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            }
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8, // Standard pill
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#334155 #0f172a",
          "&::-webkit-scrollbar": {
            width: 8,
            height: 8,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#334155",
            borderRadius: 4,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#0f172a",
          },
        },
      },
    },
  },
});

export default theme;
