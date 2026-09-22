
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'

function Settings({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'divider' }}>
        <List disablePadding>
          <ListItem sx={{ px: 1, py: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <TuneOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="General Preferences"
              secondary="Configure model behavior and document retrieval"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }}
              secondaryTypographyProps={{ fontSize: '0.8rem' }}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem sx={{ px: 1, py: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <VpnKeyOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="API Keys"
              secondary="Manage API keys and external service connections"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }}
              secondaryTypographyProps={{ fontSize: '0.8rem' }}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem sx={{ px: 1, py: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <NotificationsNoneOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="Notifications"
              secondary="Receive alerts for long-running analyses"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }}
              secondaryTypographyProps={{ fontSize: '0.8rem' }}
            />
            <Switch defaultChecked edge="end" size="small" />
          </ListItem>
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" size="small">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default Settings
