import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      light: '#d3e3fd',
      dark: '#1557b0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#edeffa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#444746',
      disabled: '#747775',
    },
    divider: '#dadce0',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 500,
      fontSize: '1.05rem',
      color: '#1f1f1f',
    },
    body1: {
      color: '#444746',
      fontSize: '0.95rem',
    },
    body2: {
      color: '#444746',
      fontSize: '0.85rem',
    },
    caption: {
      color: '#747775',
    },
  },
  shape: {
    borderRadius: 24,
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'inherit',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#edeffa',
          borderBottom: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#444746',
        },
      },
    },
  },
})

export default theme
