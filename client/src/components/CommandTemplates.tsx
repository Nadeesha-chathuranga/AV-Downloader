import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Lock as LockIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import TemplateEditor from './TemplateEditor';

interface Template {
  id: string;
  name: string;
  description: string;
  args: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommandTemplatesProps {
  onApplyTemplate: (args: string) => void;
}

const CommandTemplates: React.FC<CommandTemplatesProps> = ({ onApplyTemplate }) => {
  const [defaults, setDefaults] = useState<Template[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [error, setError] = useState('');
  const { currentTheme } = useAppTheme();

  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? '/api'
      : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;

  const fetchTemplates = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const mockDefaults: Template[] = [
          { id: 'best-quality', name: 'Best Quality', description: 'Best video+audio', args: '-f bestvideo+bestaudio --merge-output-format mkv', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'audio-mp3', name: 'Audio Only (MP3)', description: 'Extract audio as MP3', args: '-x --audio-format mp3 --audio-quality 0 --embed-metadata', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'audio-flac', name: 'Audio Only (FLAC)', description: 'Lossless FLAC', args: '-x --audio-format flac --embed-metadata', builtIn: true, createdAt: '', updatedAt: '' },
          { id: '1080p-max', name: '1080p Max', description: 'Cap at 1080p', args: '-f bestvideo[height<=1080]+bestaudio --merge-output-format mp4', builtIn: true, createdAt: '', updatedAt: '' },
          { id: '4k-download', name: '4K Ultra HD', description: 'Up to 4K', args: '-f bestvideo[height<=2160]+bestaudio --merge-output-format mkv', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'with-subs', name: 'With Subtitles', description: 'Embed subtitles', args: '-f best --write-subs --sub-lang en --embed-subs --sub-format srt', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'thumbnail-embed', name: 'Thumbnail Embed', description: 'Embed thumbnail', args: '-f best --embed-thumbnail', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'minimal', name: 'Minimal', description: 'No playlist, no warnings', args: '-f best --no-playlist --no-warnings --no-check-certificates', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'archive-mode', name: 'Archive Mode', description: 'Skip previously downloaded', args: '-f best --download-archive archive.txt --no-overwrites', builtIn: true, createdAt: '', updatedAt: '' },
          { id: 'gif-convert', name: 'GIF Convert', description: 'Animated GIF', args: '-f best --merge-output-format gif', builtIn: true, createdAt: '', updatedAt: '' },
        ];
        setDefaults(mockDefaults);
        setTemplates([]);
        return;
      }

      const response = await axios.get(`${apiUrl}/templates`);
      setDefaults(response.data.defaults || []);
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.warn('Backend not available, using mock templates');
      const mockDefaults: Template[] = [
        { id: 'best-quality', name: 'Best Quality', description: 'Best video+audio', args: '-f bestvideo+bestaudio --merge-output-format mkv', builtIn: true, createdAt: '', updatedAt: '' },
        { id: 'audio-mp3', name: 'Audio Only (MP3)', description: 'Extract audio as MP3', args: '-x --audio-format mp3 --audio-quality 0 --embed-metadata', builtIn: true, createdAt: '', updatedAt: '' },
      ];
      setDefaults(mockDefaults);
      setTemplates([]);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${apiUrl}/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleSave = (template: Template) => {
    if (editingTemplate) {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
    } else {
      setTemplates((prev) => [...prev, template]);
    }
    setEditorOpen(false);
    setEditingTemplate(null);
  };

  const renderTemplate = (template: Template) => (
    <ListItem
      key={template.id}
      sx={{
        mb: 1,
        borderRadius: 1,
        background: `${currentTheme.colors.surfaceAlt}33`,
        border: `1px solid ${currentTheme.colors.border}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          background: `${currentTheme.colors.surfaceAlt}66`,
          borderColor: `${currentTheme.colors.primary}44`,
        },
      }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {template.name}
            </Typography>
            {template.builtIn && (
              <LockIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            )}
          </Box>
        }
        secondary={
          <Box>
            {template.description && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                {template.description}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                color: currentTheme.colors.primary,
                background: `${currentTheme.colors.primary}11`,
                px: 0.5,
                py: 0.25,
                borderRadius: 0.75,
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {template.args}
            </Typography>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Tooltip title="Apply to download">
          <IconButton
            size="small"
            onClick={() => onApplyTemplate(template.args)}
            sx={{
              color: currentTheme.colors.primary,
              '&:hover': { background: `${currentTheme.colors.primary}15` },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {!template.builtIn && (
          <>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingTemplate(template);
                  setEditorOpen(true);
                }}
                sx={{ color: 'text.secondary', '&:hover': { color: currentTheme.colors.info } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => handleDelete(template.id)}
                sx={{ color: 'text.secondary', '&:hover': { color: currentTheme.colors.error } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <Card
      className="glass-card"
      sx={{
        animation: 'fadeIn 0.5s ease 0.15s both',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${currentTheme.colors.warning}33, ${currentTheme.colors.primary}33)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CodeIcon sx={{ color: currentTheme.colors.warning, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Templates
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {defaults.length} built-in, {templates.length} custom
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingTemplate(null);
              setEditorOpen(true);
            }}
            sx={{
              borderColor: currentTheme.colors.border,
              color: 'text.primary',
              '&:hover': {
                borderColor: currentTheme.colors.primary,
                background: `${currentTheme.colors.primary}11`,
              },
            }}
          >
            New
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {defaults.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
                mb: 1,
                display: 'block',
              }}
            >
              Built-in
            </Typography>
            <List dense disablePadding>
              {defaults.map(renderTemplate)}
            </List>
          </Box>
        )}

        {templates.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
                mb: 1,
                display: 'block',
              }}
            >
              Custom
            </Typography>
            <List dense disablePadding>
              {templates.map(renderTemplate)}
            </List>
          </Box>
        )}
      </CardContent>

      <TemplateEditor
        open={editorOpen}
        template={editingTemplate}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSave}
      />
    </Card>
  );
};

export default CommandTemplates;
