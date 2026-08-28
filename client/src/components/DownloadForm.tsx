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
  CircularProgress,
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
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import { apiUrl } from '../config';
import PlaylistPanel from './PlaylistPanel';
import FormatSelector, { FormatEntry } from './FormatSelector';

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

interface OptionDef {
  id: string;
  label: string;
  args: string;
}

interface OptionGroup {
  category: string;
  options: OptionDef[];
}

const OPTION_GROUPS: OptionGroup[] = [
  {
    category: 'Output',
    options: [
      { id: 'best-quality', label: 'Best Quality', args: '-f bestvideo+bestaudio' },
      { id: 'best-audio', label: 'Best Audio', args: '-f bestaudio' },
      { id: 'merge-mp4', label: 'Merge MP4', args: '--merge-output-format mp4' },
      { id: 'merge-mkv', label: 'Merge MKV', args: '--merge-output-format mkv' },
      { id: 'mp3', label: 'MP3', args: '-x --audio-format mp3' },
      { id: 'flac', label: 'FLAC', args: '-x --audio-format flac' },
      { id: 'm4a', label: 'M4A', args: '-x --audio-format m4a' },
    ],
  },
  {
    category: 'Subtitles',
    options: [
      { id: 'write-subs', label: 'Write Subs', args: '--write-subs' },
      { id: 'embed-subs', label: 'Embed Subs', args: '--write-subs --embed-subs' },
      { id: 'sub-lang', label: 'English Subs', args: '--write-subs --sub-lang en --embed-subs --sub-format srt' },
      { id: 'auto-subs', label: 'Auto Subs', args: '--write-auto-subs --embed-subs' },
    ],
  },
  {
    category: 'Metadata',
    options: [
      { id: 'embed-metadata', label: 'Embed Metadata', args: '--embed-metadata' },
      { id: 'embed-thumb', label: 'Embed Thumbnail', args: '--embed-thumbnail' },
      { id: 'write-desc', label: 'Write Description', args: '--write-description' },
      { id: 'write-info', label: 'Write Info JSON', args: '--write-info-json' },
      { id: 'write-chapters', label: 'Write Chapters', args: '--write-chapters' },
    ],
  },
  {
    category: 'Playback',
    options: [
      { id: 'no-playlist', label: 'No Playlist', args: '--no-playlist' },
      { id: 'no-overwrite', label: 'No Overwrite', args: '--no-overwrites' },
      { id: 'archive', label: 'Archive Mode', args: '--download-archive archive.txt' },
    ],
  },
  {
    category: 'Network',
    options: [
      { id: 'rate-limit', label: 'Rate Limit 5M', args: '--limit-rate 5M' },
      { id: 'ignore-errors', label: 'Ignore Errors', args: '--ignore-errors' },
      { id: 'no-cert', label: 'No Cert Check', args: '--no-check-certificates' },
      { id: 'retries', label: 'Retries 10', args: '--retries 10' },
    ],
  },
];

const DownloadForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [audioOnly, setAudioOnly] = useState(false);
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('720');
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
  const [videoFormats, setVideoFormats] = useState<FormatEntry[]>([]);
  const [audioFormats, setAudioFormats] = useState<FormatEntry[]>([]);
  const [allFormats, setAllFormats] = useState<FormatEntry[]>([]);
  const [recommendedVideo, setRecommendedVideo] = useState<string | null>(null);
  const [recommendedAudio, setRecommendedAudio] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [selectedFormatSelector, setSelectedFormatSelector] = useState<string | undefined>(undefined);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(false);
  const [writeSubs, setWriteSubs] = useState(false);
  const [embedSubs, setEmbedSubs] = useState(true);
  const [subLang, setSubLang] = useState('en');
  const [subFormat, setSubFormat] = useState('srt');
  const [qualityPresets, setQualityPresets] = useState<{
    video: QualityPreset[];
    audio: QualityPreset[];
  }>({ video: [], audio: [] });
  const { currentTheme } = useAppTheme();

  // Auto-dismiss the success notification after a few seconds.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const buildSelector = (formatId: string, formats: FormatEntry[]): string => {
    const fmt = formats.find((f) => f.format_id === formatId);
    if (!fmt) return formatId;
    const height = fmt.height || '';
    const cap = (prefix: string) => `${prefix}${height ? `[height<=${height}]` : ''}`;
    if (fmt.type === 'video-only') {
      // Merge with best audio, degrading by height cap in case the exact id
      // is unavailable at download time (e.g. cookies switch the player client).
      return `${formatId}+bestaudio/${cap('bestvideo')}+bestaudio/${cap('best')}/b`;
    }
    if (fmt.type === 'audio') {
      // Audio-only pick; fall back to the lightest combined stream so audio
      // extraction never downloads a huge video file.
      return `${formatId}/bestaudio/best[height<=144]/b`;
    }
    // Progressive (video+audio in one file) - try exactly, then by height cap.
    return `${formatId}/${cap('best')}/b`;
  };

  const handleSelectFormat = (formatId: string) => {
    setSelectedFormatId(formatId);
    setSelectedFormatSelector(buildSelector(formatId, allFormats));
  };

  const resetFormatSelection = () => {
    setSelectedFormatId(null);
    setSelectedFormatSelector(undefined);
    setVideoFormats([]);
    setAudioFormats([]);
    setAllFormats([]);
    setRecommendedVideo(null);
    setRecommendedAudio(null);
  };

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
    resetFormatSelection();
    try {
      if (isPlaylist) {
        const response = await axios.get(`${apiUrl}/info/playlist`, { params: { url } });
        setPlaylistInfo(response.data.entries);
      } else {
        const infoResponse = await axios.get(`${apiUrl}/info`, { params: { url } });
        setVideoInfo(infoResponse.data);

        try {
          const fmtResponse = await axios.get(`${apiUrl}/formats`, { params: { url } });
          const fetchedAll = fmtResponse.data.all_formats || [];
          const fetchedVideo = fmtResponse.data.video_formats || [];
          const fetchedAudio = fmtResponse.data.audio_formats || [];
          setVideoFormats(fetchedVideo);
          setAudioFormats(fetchedAudio);
          setAllFormats(fetchedAll);
          setRecommendedVideo(fmtResponse.data.recommended_video || null);
          setRecommendedAudio(fmtResponse.data.recommended_audio || null);
          if (fmtResponse.data.recommended_video) {
            const rec = fmtResponse.data.recommended_video;
            setSelectedFormatId(rec);
            setSelectedFormatSelector(buildSelector(rec, fetchedAll));
          }
        } catch {
          // Formats fetch failed, non-critical
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setError('Backend server not available. Please start the backend server.');
        if (!isPlaylist) {
          setVideoInfo({
            id: 'demo123',
            title: 'Demo Video - Seal Web Downloader Preview',
            description: 'Backend server needs to be running.',
            duration: 180,
            uploader: 'Seal Web Downloader Demo',
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
      // For audio-only we ignore any video format selection (which may be
      // auto-selected by "Get Info") — the backend just extracts audio.
      const useFormatSelection = !audioOnly && selectedFormatId;
      const selectedFmt = useFormatSelection ? allFormats.find((f) => f.format_id === selectedFormatId) : undefined;
      const expectedSize = useFormatSelection && selectedFmt && selectedFmt.filesize ? selectedFmt.filesize : undefined;
      const response = await axios.post(`${apiUrl}/download`, {
        url,
        format: audioOnly ? format : undefined,
        quality: !audioOnly ? quality : undefined,
        audioOnly,
        customArgs: customArgs.trim() || undefined,
        formatId: useFormatSelection ? selectedFormatId : undefined,
        formatSelector: useFormatSelection ? selectedFormatSelector : undefined,
        expectedSize,
        embedMetadata,
        embedThumbnail,
        writeSubs,
        embedSubs,
        subLang,
        subFormat,
      });
      if (response.data.success) {
        setSuccess('Download started successfully!');
        setUrl('');
        setVideoInfo(null);
        setPlaylistInfo(null);
        resetFormatSelection();
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
        embedMetadata,
        embedThumbnail,
        writeSubs,
        embedSubs,
        subLang,
        subFormat,
      });
      if (response.data.success) {
        setSuccess(`Playlist download started: ${response.data.total} videos queued`);
        setUrl('');
        setVideoInfo(null);
        setPlaylistInfo(null);
        resetFormatSelection();
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

  const isOptionActive = (args: string) => {
    const parts = args.split(/\s+/);
    const current = customArgs;
    return parts.every((p) => current.includes(p));
  };

  const toggleOption = (args: string) => {
    setSelectedTemplateId('');
    const parts = args.split(/\s+/);
    const current = customArgs.trim();
    const active = parts.every((p) => current.includes(p));
    if (active) {
      let next = current;
      for (const p of parts) {
        next = next.replace(new RegExp(`\\s*${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), ' ').trim();
      }
      setCustomArgs(next.replace(/\s+/g, ' ').trim());
    } else {
      setCustomArgs(current ? `${current} ${args}` : args);
    }
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
              width: 40, height: 40, borderRadius: 1.5,
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
                  fontWeight: 600, borderRadius: 1,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              {loading && <CircularProgress size={18} sx={{ color: currentTheme.colors.primary }} />}
            </Box>
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
          </Box>
        </Box>

        {/* Always-visible quality section */}
        <Box sx={{ mb: 3, p: 2, borderRadius: 1.5, background: `${currentTheme.colors.surfaceAlt}66`, border: `1px solid ${currentTheme.colors.border}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Quality
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.primary },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.primary },
                  }}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>Audio Only</Typography>}
              sx={{ m: 0 }}
            />
          </Box>

          {audioOnly ? (
            <FormControl fullWidth sx={{ mt: 1.5 }}>
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
            <FormControl fullWidth sx={{ mt: 1.5 }}>
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

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
            <Button
              size="small"
              variant="text"
              startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ color: 'text.secondary', textTransform: 'none', '&:hover': { color: currentTheme.colors.primary } }}
            >
              {showAdvanced ? 'Hide options' : 'Show options'}
            </Button>
          </Box>
        </Box>

        <Collapse in={showAdvanced}>
          <Box sx={{ mb: 3, p: 2.5, borderRadius: 1.5, background: `${currentTheme.colors.surfaceAlt}66`, border: `1px solid ${currentTheme.colors.border}` }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Options
            </Typography>

            <Divider sx={{ my: 2.5, borderColor: currentTheme.colors.border }} />

            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Metadata & Subtitles
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={embedMetadata}
                    onChange={(e) => setEmbedMetadata(e.target.checked)}
                    size="small"
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.success }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.success } }}
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>Embed Metadata</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={embedThumbnail}
                    onChange={(e) => setEmbedThumbnail(e.target.checked)}
                    size="small"
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.success }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.success } }}
                  />
                }
                label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>Embed Thumbnail</Typography>}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={writeSubs}
                      onChange={(e) => setWriteSubs(e.target.checked)}
                      size="small"
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.info }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.info } }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>Include Subtitles</Typography>}
                />
              </Box>

              {writeSubs && (
                <Box sx={{ display: 'flex', gap: 1.5, ml: 5, mt: 0.5 }}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Language</InputLabel>
                    <Select value={subLang} label="Language" onChange={(e) => setSubLang(e.target.value)}>
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="de">German</MenuItem>
                      <MenuItem value="ja">Japanese</MenuItem>
                      <MenuItem value="ko">Korean</MenuItem>
                      <MenuItem value="zh">Chinese</MenuItem>
                      <MenuItem value="si">Sinhala</MenuItem>
                      <MenuItem value="auto">Auto-detect</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Format</InputLabel>
                    <Select value={subFormat} label="Format" onChange={(e) => setSubFormat(e.target.value)}>
                      <MenuItem value="srt">SRT</MenuItem>
                      <MenuItem value="vtt">VTT</MenuItem>
                      <MenuItem value="ass">ASS</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={embedSubs}
                        onChange={(e) => setEmbedSubs(e.target.checked)}
                        size="small"
                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.info }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.info } }}
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>Embed in video</Typography>}
                  />
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2.5, borderColor: currentTheme.colors.border }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CodeIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                Quick Options
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {OPTION_GROUPS.map((group) => (
                <Box key={group.category}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    {group.category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {group.options.map((opt) => {
                      const active = isOptionActive(opt.args);
                      return (
                        <Tooltip key={opt.id} title={opt.args} arrow placement="top">
                          <Chip
                            label={opt.label}
                            size="small"
                            onClick={() => toggleOption(opt.args)}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              height: 28,
                              borderRadius: 1,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: active ? `${currentTheme.colors.primary}` : `${currentTheme.colors.surfaceAlt}`,
                              color: active ? '#fff' : 'text.secondary',
                              border: `1px solid ${active ? currentTheme.colors.primary : currentTheme.colors.border}`,
                              '&:hover': {
                                background: active ? currentTheme.colors.primary : `${currentTheme.colors.primary}22`,
                                borderColor: currentTheme.colors.primary,
                              },
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2.5, borderColor: currentTheme.colors.border }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                Templates
              </Typography>
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Load Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Load Template"
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
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None</Typography>
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
              label="yt-dlp arguments"
              placeholder="Type or click options above"
              value={customArgs}
              onChange={(e) => { setCustomArgs(e.target.value); setSelectedTemplateId(''); }}
              sx={{
                mb: 2,
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' },
              }}
            />

            <Box sx={{ p: 1.5, borderRadius: 1, background: `${currentTheme.colors.surface}88`, border: `1px solid ${currentTheme.colors.border}` }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {getCommandPreview()}
              </Typography>
            </Box>
          </Box>
        </Collapse>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, background: `${currentTheme.colors.error}15`, border: `1px solid ${currentTheme.colors.error}33` }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2, borderRadius: 1.5, background: `${currentTheme.colors.success}15`, border: `1px solid ${currentTheme.colors.success}33` }}
            action={
              <IconButton aria-label="close" size="small" onClick={() => setSuccess('')} sx={{ color: 'inherit' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {success}
          </Alert>
        )}

        {playlistInfo && (
          <PlaylistPanel entries={playlistInfo} onDownload={handlePlaylistDownload} loading={loading} />
        )}

        {videoInfo && (
          <Card sx={{ mt: 2, background: `${currentTheme.colors.surfaceAlt}44`, border: `1px solid ${currentTheme.colors.border}`, borderRadius: 1.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2.5 }}>
                {videoInfo.thumbnail && (
                  <Box component="img" src={videoInfo.thumbnail} alt="Thumbnail" sx={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
                )}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>{videoInfo.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>by {videoInfo.uploader}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={formatDuration(videoInfo.duration)} sx={{ background: `${currentTheme.colors.primary}22`, color: currentTheme.colors.primary, fontWeight: 600, borderRadius: 0.75 }} />
                    <Chip size="small" label={`${videoInfo.view_count?.toLocaleString()} views`} sx={{ background: `${currentTheme.colors.secondary}22`, color: currentTheme.colors.secondary, fontWeight: 600, borderRadius: 0.75 }} />
                    <Chip size="small" label={videoInfo.extractor} sx={{ background: `${currentTheme.colors.info}22`, color: currentTheme.colors.info, fontWeight: 600, borderRadius: 0.75 }} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {allFormats.length > 0 && (
          <FormatSelector
            videoFormats={videoFormats}
            audioFormats={audioFormats}
            allFormats={allFormats}
            recommendedVideo={recommendedVideo}
            recommendedAudio={recommendedAudio}
            selectedFormatId={selectedFormatId}
            onSelectFormat={handleSelectFormat}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DownloadForm;
