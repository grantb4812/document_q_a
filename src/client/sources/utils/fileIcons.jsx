import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'

export function getFileIcon(filename = '') {
  if (filename.toLowerCase().endsWith('.pdf')) {
    return <PictureAsPdfOutlinedIcon sx={{ fontSize: 20, color: '#d93025' }} />
  }
  return <DescriptionOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
}
