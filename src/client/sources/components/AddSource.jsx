import { useRef } from 'react'
import { Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useSources } from '../context/useSources'
import { FILE_ACCEPT_STRING } from '../constants/fileTypes'
import { isValidDocumentFile } from '../utils/fileValidation'

function AddSource() {
  const fileInputRef = useRef(null)
  const { uploadDocument } = useSources()

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isValidDocumentFile(file)) {
      console.warn('[AddSource] Selected file type is not supported:', file.name)
      return
    }

    uploadDocument(file)
  }

  return (
    <>
      {/* Hidden file input restricted to supported document types */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={FILE_ACCEPT_STRING}
        style={{ display: 'none' }}
      />

      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon />}
        onClick={handleButtonClick}
        sx={{
          py: 1,
          borderColor: 'divider',
          borderRadius: '24px',
          textTransform: 'none',
          fontWeight: 500,
          '&:hover': {
            borderColor: 'divider',
            bgcolor: 'action.hover',
          },
        }}
      >
        Add sources
      </Button>
    </>
  )
}

export default AddSource
