import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Link as LinkIcon,
  QueueMusic as PlaylistIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import PlaylistPanel from './PlaylistPanel';

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  uploader: string;
  upload_date: string;
  view_count: number;
  thumbnail: string;
  webpage_url: string;
  extractor: string;
}

interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number;
  uploader: string;
}

interface QualityPreset {
  value: string;
  label: string;
  description: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  args: string;
  builtIn: boolean;
}

const isPlaylistUrl = (url: string): boolean => {
  const playlistPatterns = [
    /[?&]list=/,
    /playlist\?list=/,
    /\/playlist\//,
    /\/playlist$/,
    /youtube\.com\/.*list=/,
    /youtu\.be\/.*list=/,
    /open\.spotify\.com\/playlist/,
    /soundcloud\.com\/.*\/sets\//,
  ];
  return playlistPatterns.some((pattern) => pattern.test(url));
};

const DownloadForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [audioOnly, setAudioOnly] = useState(false);
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('best');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistEntry[] | null>(null);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customArgs, setCustomArgs] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [qualityPresets, setQualityPresets] = useState<{
    video: QualityPreset[];
    audio: QualityPreset[];
  }>({ video: [], audio: [] });
  const { currentTheme } = useAppTheme();

  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? '/api'
      : `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api`;

  const fetchQualityPresets = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        setQualityPresets({
          video: [
            { value: '2160', label: '4K (2160p)', description: 'Ultra High Definition' },
            { value: '1440', label: '2K (1440p)', description: 'Quad HD' },
            { value: '1080', label: 'Full HD (1080p)', description: 'High Definition' },
            { value: '720', label: 'HD (720p)', description: 'High Definition' },
            { value: '480', label: 'SD (480p)', description: 'Standard Definition' },
            { value: '360', label: 'Low (360p)', description: 'Low Quality' },
            { value: 'best', label: 'Best Available', description: 'Highest quality available' },
            { value: 'worst', label: 'Worst Available', description: 'Lowest quality available' },
          ],
          audio: [
            { value: 'mp3', label: 'MP3', description: 'Standard audio format' },
            { value: 'm4a', label: 'M4A', description: 'High quality audio' },
            { value: 'wav', label: 'WAV', description: 'Uncompressed audio' },
            { value: 'flac', label: 'FLAC', description: 'Lossless audio' },
            { value: 'ogg', label: 'OGG', description: 'Open source audio' },
            { value: 'best', label: 'Best Available', description: 'Highest quality available' },
          ],
        });
        return;
      }
      const response = await axios.get(`${apiUrl}/formats/quality-presets`);
      setQualityPresets(response.data);
    } catch {
      setQualityPresets({
        video: [
          { value: 'best', label: 'Best Available', description: 'Highest quality available' },
          { value: '1080', label: 'Full HD (1080p)', description: 'High Definition' },
          { value: '720', label: 'HD (720p)', description: 'High Definition' },
        ],
        audio: [
          { value: 'mp3', label: 'MP3', description: 'Standard audio format' },
          { value: 'm4a', label: 'M4A', description: 'High quality audio' },
        ],
      });
    }
  }, [apiUrl]);

  const fetchTemplates = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        setAllTemplates([
          { id: 'best-quality', name: 'Best Quality', description: 'Best video+audio', args: '-f bestvideo+bestaudio --merge-output-format mkv', builtIn: true },
          { id: 'audio-mp3', name: 'Audio Only (MP3)', description: 'Extract audio as MP3', args: '-x --audio-format mp3 --audio-quality 0 --embed-metadata', builtIn: true },
          { id: 'audio-flac', name: 'Audio Only (FLAC)', description: 'Lossless FLAC', args: '-x --audio-format flac --embed-metadata', builtIn: true },
          { id: '1080p-max', name: '1080p Max', description: 'Cap at 1080p', args: '-f bestvideo[height<=1080]+bestaudio --merge-output-format mp4', builtIn: true },
          { id: '4k-download', name: '4K Ultra HD', description: 'Up to 4K', args: '-f bestvideo[height<=2160]+bestaudio --merge-output-format mkv', builtIn: true },
          { id: 'with-subs', name: 'With Subtitles', description: 'Embed subtitles', args: '-f best --write-subs --sub-lang en --embed-subs --sub-format srt', builtIn: true },
          { id: 'thumbnail-embed', name: 'Thumbnail Embed', description: 'Embed thumbnail', args: '-f best --embed-thumbnail', builtIn: true },
          { id: 'minimal', name: 'Minimal', description: 'No playlist, no warnings', args: '-f best --no-playlist --no-warnings --no-check-certificates', builtIn: true },
          { id: 'archive-mode', name: 'Archive Mode', description: 'Skip previously downloaded', args: '-f best --download-archive archive.txt --no-overwrites', builtIn: true },
          { id: 'gif-convert', name: 'GIF Convert', description: 'Animated GIF', args: '-f best --merge-output-format gif', builtIn: true },
        ]);
        return;
      }
      const response = await axios.get(`${apiUrl}/templates`);
      const combined = [...(response.data.defaults || []), ...(response.data.templates || [])];
      setAllTemplates(combined);
    } catch {
      setAllTemplates([
        { id: 'best-quality', name: 'Best Quality', description: 'Best video+audio', args: '-f bestvideo+bestaudio --merge-output-format mkv', builtIn: true },
        { id: 'audio-mp3', name: 'Audio Only (MP3)', description: 'Extract audio as MP3', args: '-x --audio-format mp3 --audio-quality 0 --embed-metadata', builtIn: true },
      ]);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchQualityPresets();
    fetchTemplates();
  }, [fetchQualityPresets, fetchTemplates]);

  useEffect(() => {
    const detected = isPlaylistUrl(url);
    setIsPlaylist(detected);
    if (!detected) setPlaylistInfo(null);
  }, [url]);

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setPlaylistInfo(null);
    try {
      if (isPlaylist) {
        const response = await axios.get(`${apiUrl}/info/playlist`, { params: { url } });
        setPlaylistInfo(response.data.entries);
      } else {
        const response = await axios.get(`${apiUrl}/info`, { params: { url } });
        setVideoInfo(response.data);
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setError('Backend server not available. Please start the backend server.');
        if (!isPlaylist) {
          setVideoInfo({
            id: 'demo123',
            title: 'Demo Video - Universal Downloader Preview',
            description: 'Backend server needs to be running.',
            duration: 180,
            uploader: 'Universal Downloader Demo',
            upload_date: '20250826',
            view_count: 1000,
            thumbnail: 'https://via.placeholder.com/320x180/1976d2/ffffff?text=Demo+Video',
            webpage_url: url,
            extractor: 'demo',
          });
        }
      } else {
        setError(error.response?.data?.error || 'Failed to fetch video information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.post(`${apiUrl}/download`, {
        url,
        format: audioOnly ? format : undefined,
        quality: !audioOnly ? quality : undefined,
        audioOnly,
        customArgs: customArgs.trim() || undefined,
      });
      if (response.data.success) {
        setSuccess('Download started successfully!');
        setUrl('');
        setVideoInfo(null);
        setPlaylistInfo(null);
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setError('Backend server not available.');
      } else {
        setError(error.response?.data?.error || 'Download failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistDownload = async (selectedEntries: PlaylistEntry[]) => {
    if (selectedEntries.length === 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const urls = selectedEntries.map((e) => e.url);
      const response = await axios.post(`${apiUrl}/download/playlist`, {
        urls,
        format: audioOnly ? format : undefined,
        quality: !audioOnly ? quality : undefined,
        audioOnly,
      });
      if (response.data.success) {
        setSuccess(`Playlist download started: ${response.data.total} videos queued`);
        setUrl('');
        setVideoInfo(null);
        setPlaylistInfo(null);
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setError('Backend server not available.');
      } else {
        setError(error.response?.data?.error || 'Playlist download failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCommandPreview = () => {
    if (customArgs.trim()) return `yt-dlp ${customArgs} ${url || '[URL]'}`;
    if (audioOnly) return `yt-dlp -f bestaudio/best --extract-audio --audio-format ${format} ${url || '[URL]'}`;
    return `yt-dlp -f best[height<=${quality}]/best ${url || '[URL]'}`;
  };

  return (
    <Card
      className="glass-card"
      sx={{ mb: 3, animation: 'fadeIn 0.5s ease', overflow: 'visible' }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 3,
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}33, ${currentTheme.colors.secondary}33)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <DownloadIcon sx={{ color: currentTheme.colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              Download
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Paste a URL to get started
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Video / Playlist URL"
            placeholder="https://www.youtube.com/watch?v=... or playlist?list=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            InputProps={{
              startAdornment: <LinkIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: `${currentTheme.colors.surfaceAlt}88` } }}
          />

          <Collapse in={isPlaylist}>
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<PlaylistIcon sx={{ fontSize: 16 }} />}
                label="Playlist detected"
                size="small"
                sx={{
                  background: `${currentTheme.colors.secondary}22`,
                  color: currentTheme.colors.secondary,
                  fontWeight: 600, borderRadius: 2,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              {playlistInfo && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {playlistInfo.length} videos found
                </Typography>
              )}
            </Box>
          </Collapse>

          <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={fetchVideoInfo}
              disabled={loading || !url.trim()}
              sx={{
                borderColor: currentTheme.colors.border, color: 'text.primary',
                '&:hover': { borderColor: currentTheme.colors.primary, background: `${currentTheme.colors.primary}11` },
              }}
            >
              {isPlaylist ? 'Get Playlist' : 'Get Info'}
            </Button>
            {!isPlaylist && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                disabled={loading || !url.trim()}
                sx={{ px: 4 }}
              >
                Download
              </Button>
            )}
            <Tooltip title={showAdvanced ? 'Hide options' : 'Show options'}>
              <IconButton
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ color: 'text.secondary', transition: 'all 0.2s ease', '&:hover': { color: currentTheme.colors.primary } }}
              >
                {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={showAdvanced}>
          <Box sx={{ mb: 3, p: 2.5, borderRadius: 3, background: `${currentTheme.colors.surfaceAlt}66`, border: `1px solid ${currentTheme.colors.border}` }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Options
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.primary },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.primary },
                  }}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Audio Only</Typography>}
            />

            {audioOnly ? (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Audio Format</InputLabel>
                <Select value={format} label="Audio Format" onChange={(e) => setFormat(e.target.value)}>
                  {qualityPresets.audio.map((preset) => (
                    <MenuItem key={preset.value} value={preset.value}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{preset.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{preset.description}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Video Quality</InputLabel>
                <Select value={quality} label="Video Quality" onChange={(e) => setQuality(e.target.value)}>
                  {qualityPresets.video.map((preset) => (
                    <MenuItem key={preset.value} value={preset.value}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{preset.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{preset.description}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Divider sx={{ my: 2.5, borderColor: currentTheme.colors.border }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CodeIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                Advanced
              </Typography>
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Command Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Command Template"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTemplateId(val);
                  if (val) {
                    const tpl = allTemplates.find((t) => t.id === val);
                    if (tpl) setCustomArgs(tpl.args);
                  }
                }}
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None (use defaults)</Typography>
                </MenuItem>
                {allTemplates.map((tpl) => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{tpl.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem' }}>{tpl.args}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              label="Custom yt-dlp arguments"
              placeholder="-f best --embed-metadata --embed-thumbnail"
              value={customArgs}
              onChange={(e) => { setCustomArgs(e.target.value); setSelectedTemplateId(''); }}
              sx={{
                mb: 2,
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' },
              }}
            />

            <Box sx={{ p: 1.5, borderRadius: 2, background: `${currentTheme.colors.surface}88`, border: `1px solid ${currentTheme.colors.border}` }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {getCommandPreview()}
              </Typography>
            </Box>
          </Box>
        </Collapse>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3, background: `${currentTheme.colors.error}15`, border: `1px solid ${currentTheme.colors.error}33` }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 3, background: `${currentTheme.colors.success}15`, border: `1px solid ${currentTheme.colors.success}33` }}>
            {success}
          </Alert>
        )}

        {playlistInfo && (
          <PlaylistPanel entries={playlistInfo} onDownload={handlePlaylistDownload} loading={loading} />
        )}

        {videoInfo && (
          <Card sx={{ mt: 2, background: `${currentTheme.colors.surfaceAlt}44`, border: `1px solid ${currentTheme.colors.border}`, borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2.5 }}>
                {videoInfo.thumbnail && (
                  <Box component="img" src={videoInfo.thumbnail} alt="Thumbnail" sx={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                )}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>{videoInfo.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>by {videoInfo.uploader}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={formatDuration(videoInfo.duration)} sx={{ background: `${currentTheme.colors.primary}22`, color: currentTheme.colors.primary, fontWeight: 600, borderRadius: 1.5 }} />
                    <Chip size="small" label={`${videoInfo.view_count?.toLocaleString()} views`} sx={{ background: `${currentTheme.colors.secondary}22`, color: currentTheme.colors.secondary, fontWeight: 600, borderRadius: 1.5 }} />
                    <Chip size="small" label={videoInfo.extractor} sx={{ background: `${currentTheme.colors.info}22`, color: currentTheme.colors.info, fontWeight: 600, borderRadius: 1.5 }} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default DownloadForm;
