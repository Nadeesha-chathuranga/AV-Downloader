import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Star as StarIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  List as AllIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../theme/ThemeContext';

export interface FormatEntry {
  format_id: string;
  ext: string;
  resolution: string;
  height: number | null;
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
  filesize: number | null;
  tbr: number | null;
  vbr: number | null;
  abr: number | null;
  note: string;
  type: string;
}

interface FormatSelectorProps {
  videoFormats: FormatEntry[];
  audioFormats: FormatEntry[];
  allFormats: FormatEntry[];
  recommendedVideo: string | null;
  recommendedAudio: string | null;
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string) => void;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '--';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatBitrate = (kbps: number | null) => {
  if (!kbps) return '--';
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${Math.round(kbps)} kbps`;
};

const codecShort = (codec: string | null) => {
  if (!codec || codec === 'none') return '--';
  if (codec.startsWith('avc1')) return 'H.264';
  if (codec.startsWith('av01')) return 'AV1';
  if (codec.startsWith('vp09') || codec.startsWith('vp9')) return 'VP9';
  if (codec.startsWith('vp08') || codec.startsWith('vp8')) return 'VP8';
  if (codec.startsWith('mp4a')) return 'AAC';
  if (codec.startsWith('opus')) return 'Opus';
  if (codec.startsWith('vorbis')) return 'Vorbis';
  if (codec.startsWith('flac')) return 'FLAC';
  if (codec.startsWith('mp3')) return 'MP3';
  if (codec.startsWith('aac')) return 'AAC';
  return codec.split('.')[0];
};

const FormatSelector: React.FC<FormatSelectorProps> = ({
  videoFormats,
  audioFormats,
  allFormats,
  recommendedVideo,
  recommendedAudio,
  selectedFormatId,
  onSelectFormat,
}) => {
  const [tab, setTab] = useState(0);
  const { currentTheme } = useAppTheme();

  const formatRows = tab === 0 ? videoFormats : tab === 1 ? audioFormats : allFormats;
  const sorted = [...formatRows].sort((a, b) => {
    if (a.height && b.height) return b.height - a.height;
    if (a.tbr && b.tbr) return b.tbr - a.tbr;
    return 0;
  });

  const isRecommended = (f: FormatEntry) =>
    f.format_id === recommendedVideo || f.format_id === recommendedAudio;

  return (
    <Card
      className="glass-card"
      sx={{
        mt: 2,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Available Formats
          </Typography>
          <Chip
            label={`${videoFormats.length} video, ${audioFormats.length} audio`}
            size="small"
            sx={{
              background: `${currentTheme.colors.primary}22`,
              color: currentTheme.colors.primary,
              fontWeight: 600,
              borderRadius: 1,
              fontSize: '0.65rem',
            }}
          />
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 2,
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              minWidth: 80,
            },
            '& .MuiTabs-indicator': {
              background: currentTheme.colors.primary,
              height: 2,
            },
          }}
        >
          <Tab icon={<VideoIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Video (${videoFormats.length})`} />
          <Tab icon={<AudioIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Audio (${audioFormats.length})`} />
          <Tab icon={<AllIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`All (${allFormats.length})`} />
        </Tabs>

        <TableContainer
          sx={{
            maxHeight: 340,
            borderRadius: 1,
            border: `1px solid ${currentTheme.colors.border}`,
            background: `${currentTheme.colors.surfaceAlt}33`,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { background: `${currentTheme.colors.border}`, borderRadius: 1.5 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Format', 'Resolution', 'Codec', 'Audio', 'FPS', 'Size', 'Bitrate'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                      background: currentTheme.colors.surface,
                      borderBottom: `1px solid ${currentTheme.colors.border}`,
                      zIndex: 1,
                      py: 1,
                      px: 1.5,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No formats available
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((f) => {
                  const rec = isRecommended(f);
                  const selected = f.format_id === selectedFormatId;
                  return (
                    <TableRow
                      key={f.format_id}
                      hover
                      onClick={() => onSelectFormat(f.format_id)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: selected
                          ? `${currentTheme.colors.primary}18`
                          : 'transparent',
                        borderLeft: selected ? `3px solid ${currentTheme.colors.primary}` : '3px solid transparent',
                        '&:hover': {
                          background: `${currentTheme.colors.primary}11`,
                        },
                      }}
                    >
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {f.format_id}
                          </Typography>
                          <Chip
                            label={f.ext}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              background: `${currentTheme.colors.secondary}22`,
                              color: currentTheme.colors.secondary,
                              borderRadius: 0.75,
                            }}
                          />
                          {rec && (
                            <Tooltip title="Recommended">
                              <StarIcon sx={{ fontSize: 14, color: currentTheme.colors.warning }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {f.resolution}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: f.vcodec && f.vcodec !== 'none' ? 'text.primary' : 'text.secondary' }}>
                          {codecShort(f.vcodec)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: f.acodec && f.acodec !== 'none' ? 'text.primary' : 'text.secondary' }}>
                          {codecShort(f.acodec)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {f.fps || '--'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatFileSize(f.filesize)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatBitrate(f.tbr)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedFormatId && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Selected:
            </Typography>
            <Chip
              label={selectedFormatId}
              size="small"
              sx={{
                background: `${currentTheme.colors.primary}22`,
                color: currentTheme.colors.primary,
                fontWeight: 700,
                fontFamily: 'monospace',
                borderRadius: 0.75,
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FormatSelector;
