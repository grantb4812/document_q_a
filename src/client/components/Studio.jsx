import {
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  Grid,
  Chip,
} from '@mui/material'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import CloseIcon from '@mui/icons-material/Close'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import EditNoteIcon from '@mui/icons-material/EditNote'

const studioOptions = [
  {
    title: 'Audio Overview',
    icon: <GraphicEqIcon sx={{ color: '#1a73e8', fontSize: 18 }} />,
    bg: '#edf2fa',
  },
  {
    title: 'Slide Deck',
    icon: <CoPresentOutlinedIcon sx={{ color: '#7c6800', fontSize: 18 }} />,
    bg: '#fcf6df',
  },
  {
    title: 'Video Overview',
    icon: <VideocamOutlinedIcon sx={{ color: '#137333', fontSize: 18 }} />,
    bg: '#e6f4ea',
  },
  {
    title: 'Mind Map',
    icon: <AccountTreeOutlinedIcon sx={{ color: '#b80672', fontSize: 18 }} />,
    bg: '#fce8e6',
  },
  {
    title: 'Reports',
    icon: <ArticleOutlinedIcon sx={{ color: '#a56c00', fontSize: 18 }} />,
    badge: 'New!',
    bg: '#fef7e0',
  },
  {
    title: 'Flashcards',
    icon: <StyleOutlinedIcon sx={{ color: '#c5221f', fontSize: 18 }} />,
    bg: '#fdeee9',
  },
  {
    title: 'Quiz',
    icon: <QuizOutlinedIcon sx={{ color: '#129eaf', fontSize: 18 }} />,
    bg: '#e0f2f1',
  },
  {
    title: 'Infographic',
    icon: <BarChartOutlinedIcon sx={{ color: '#7627bb', fontSize: 18 }} />,
    bg: '#f3e8fd',
  },
  {
    title: 'Data Table',
    icon: <TableChartOutlinedIcon sx={{ color: '#1a73e8', fontSize: 18 }} />,
    bg: '#edf2fa',
  },
]

function Studio() {
  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          Studio
        </Typography>
        <IconButton size="small">
          <ViewSidebarOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Announcement Banner */}
      <Paper
        sx={{
          p: 1.2,
          borderRadius: 3,
          bgcolor: 'primary.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
            🎉
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.78rem' }}
          >
            New: You can now create Interactive Reports!
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            sx={{
              borderRadius: '16px',
              bgcolor: 'background.paper',
              color: 'text.primary',
              boxShadow: 'none',
              fontSize: '0.75rem',
              px: 1.5,
              py: 0.2,
              '&:hover': {
                bgcolor: 'action.hover',
                boxShadow: 'none',
              },
            }}
          >
            Try it
          </Button>
          <IconButton size="small" sx={{ p: 0.3 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Paper>

      {/* Studio Options Grid */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {studioOptions.map((opt) => (
          <Grid size={{ xs: 12, sm: 6 }} key={opt.title}>
            <Paper
              sx={{
                p: 1.2,
                borderRadius: 2.5,
                backgroundColor: opt.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  filter: 'brightness(0.96)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {opt.icon}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.82rem',
                    color: 'text.primary',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.title}
                </Typography>
                {opt.badge && (
                  <Chip
                    label={opt.badge}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: 'text.primary',
                      color: 'background.paper',
                    }}
                  />
                )}
              </Box>
              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Output Empty State */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 1,
          mt: 'auto',
        }}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5, fontSize: '0.85rem' }}
        >
          Studio output will be saved here.
        </Typography>
        <Typography
          variant="caption"
          sx={{ lineHeight: 1.4, maxWidth: 240, mb: 2, fontSize: '0.78rem' }}
        >
          After adding sources, click to create Audio Overview, Study Guides, and more!
        </Typography>

        <Button
          variant="contained"
          size="small"
          startIcon={<EditNoteIcon />}
          sx={{
            bgcolor: 'text.primary',
            color: 'background.paper',
            px: 2,
            py: 0.6,
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#333333',
              boxShadow: 'none',
            },
          }}
        >
          Add note
        </Button>
      </Box>
    </Paper>
  )
}

export default Studio
