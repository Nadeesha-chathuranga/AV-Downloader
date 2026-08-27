import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../theme/ThemeContext';
import axios from 'axios';
import { apiUrl } from '../config';

interface Template {
  id: string;
  name: string;
  description: string;
  args: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateEditorProps {
  open: boolean;
  template: Template | null;
  onClose: () => void;
  onSave: (template: Template) => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ open, template, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [args, setArgs] = useState('');
  const [error, setError] = useState('');
  const { currentTheme } = useAppTheme();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setArgs(template.args);
    } else {
      setName('');
      setDescription('');
      setArgs('');
    }
    setError('');
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    if (!args.trim()) {
      setError('yt-dlp arguments are required');
      return;
    }

    try {
      if (template) {
        const response = await axios.put(`${apiUrl}/templates/${template.id}`, {
          name: name.trim(),
          description: description.trim(),
          args: args.trim(),
        });
        onSave(response.data);
      } else {
        const response = await axios.post(`${apiUrl}/templates`, {
          name: name.trim(),
          description: description.trim(),
          args: args.trim(),
        });
        onSave(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          background: currentTheme.colors.surface,
          border: `1px solid ${currentTheme.colors.border}`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {template ? 'Edit Template' : 'New Template'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={template?.builtIn}
          sx={{ mb: 2.5 }}
        />
        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={template?.builtIn}
          sx={{ mb: 2.5 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="yt-dlp arguments"
          placeholder="-f best --embed-metadata --embed-thumbnail"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          disabled={template?.builtIn}
          sx={{
            fontFamily: 'monospace',
            '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.9rem' },
          }}
        />

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1,
            background: `${currentTheme.colors.surfaceAlt}66`,
            border: `1px solid ${currentTheme.colors.border}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Preview: yt-dlp {args || '[arguments]'} [URL]
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          startIcon={<CancelIcon />}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
        {!template?.builtIn && (
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TemplateEditor;
