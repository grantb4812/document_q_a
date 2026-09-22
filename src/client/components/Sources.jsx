import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Link,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import LanguageIcon from '@mui/icons-material/Language'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SearchIcon from '@mui/icons-material/Search'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'

function Sources() {
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
          Sources
        </Typography>
        <IconButton size="small">
          <ViewSidebarOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Add Sources Button */}
      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon />}
        sx={{
          py: 1,
          borderColor: 'divider',
          mb: 2,
          '&:hover': {
            borderColor: 'divider',
            bgcolor: 'action.hover',
          },
        }}
      >
        Add sources
      </Button>

      {/* Search Web Sources Container */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 3,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          mb: 3,
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          Search the web for new sources
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', px: 1, py: 0.3 }}>
              <LanguageIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', px: 1, py: 0.3 }}>
              <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          <IconButton size="small">
            <SearchIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      {/* Empty State / Droppable Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 1,
        }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}>
          Saved sources will appear here
        </Typography>
        <Typography variant="caption" sx={{ lineHeight: 1.5, mb: 1, maxWidth: 220 }}>
          Add files, websites, or more. Then ask questions or create things based on these sources.
        </Typography>
        <Typography variant="caption">
          Drop files here or{' '}
          <Link
            component="button"
            variant="caption"
            underline="always"
            sx={{ color: 'text.primary', fontWeight: 500 }}
          >
            add a source
          </Link>
        </Typography>
      </Box>
    </Paper>
  )
}

export default Sources
