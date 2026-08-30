import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  MenuBook as MenuBookIcon,
  Download as DownloadIcon,
  QueueMusic as PlaylistIcon,
  HighQuality as QualityIcon,
  Subtitles as SubtitlesIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Moving as ActiveIcon,
  Help as FaqIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../theme/ThemeContext';

interface UserGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

const UserGuideDialog: React.FC<UserGuideDialogProps> = ({ open, onClose }) => {
  const { currentTheme } = useAppTheme();

  const sections: GuideSection[] = [
    {
      icon: <MenuBookIcon sx={{ fontSize: 18, color: currentTheme.colors.primary }} />,
      title: 'Getting Started',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              Make sure the backend server is running. The status chip in the top bar shows <strong>Online</strong> when ready. If it shows <strong>Offline</strong>, run <code>npm run dev</code> in the project root.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Downloads are saved under <strong>AV Downloader</strong> on your computer, split automatically into a <strong>Video</strong> folder and an <strong>Audio</strong> folder. You can change this location in Settings.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Paste any supported URL to get started, then click <strong>Download</strong>.
            </Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <DownloadIcon sx={{ fontSize: 18, color: currentTheme.colors.primary }} />,
      title: 'Downloading a Video',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">Paste the video URL into the <strong>Video / Playlist URL</strong> field.</Typography>
          </li>
          <li>
            <Typography variant="body2">
              Click <strong>Get Info</strong> to preview the video (title, uploader, duration, views). A thumbnail and an <strong>Available Formats</strong> table appear below.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              In the formats table use the <strong>Video</strong>, <strong>Audio</strong>, and <strong>All</strong> tabs. Each row shows codec, resolution, FPS, file size, and bitrate. Rows marked with a <strong>star</strong> are recommended. Click a row to select it.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">Click the <strong>Download</strong> button. A message confirms the download started, and progress appears in the <strong>Active Downloads</strong> panel on the right.</Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <PlaylistIcon sx={{ fontSize: 18, color: currentTheme.colors.secondary }} />,
      title: 'Playlists',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              Paste a playlist link (e.g. a YouTube <code>?list=...</code> URL). The app detects it automatically and shows a <strong>Playlist detected</strong> chip.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">Each video has a checkbox so you can pick which ones to download.</Typography>
          </li>
          <li>
            <Typography variant="body2">Use <strong>All</strong> / <strong>None</strong> to select or clear everything quickly.</Typography>
          </li>
          <li>
            <Typography variant="body2">Click <strong>Download Selected</strong> to queue the checked videos as one batch.</Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <QualityIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />,
      title: 'Quality',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              <strong>Audio Only</strong> toggle: switch to true to extract just the audio instead of the video.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Video Quality</strong>: choose a resolution preset (4K, 2K, 1080p, 720p, 480p, 360p, Best Available, Worst Available). Higher quality uses more disk space and bandwidth.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Audio Format</strong> (when Audio Only is on): MP3 (smallest, standard), M4A (good quality), WAV (uncompressed, large), FLAC (lossless, large), OGG (open source), or Best Available.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">Use the <strong>Show options</strong> button at the bottom of this section to open the full Options panel for more controls.</Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <SubtitlesIcon sx={{ fontSize: 18, color: currentTheme.colors.info }} />,
      title: 'Metadata & Subtitles',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              <strong>Embed Metadata</strong>: writes information like title, artist, and uploader into the file itself (useful for music players).
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Embed Thumbnail</strong>: embeds the video thumbnail as cover art for the file.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Include Subtitles</strong>: downloads subtitles for the video. When enabled, you can set the <strong>Language</strong>, the subtitle <strong>Format</strong> (SRT, VTT, or ASS), and choose <strong>Embed in video</strong> to burn them into the file.
            </Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <CodeIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />,
      title: 'Quick Options',
      body: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            These are shortcut chips that add yt-dlp arguments to your download. Click a chip to toggle it on (filled) or off. They are grouped by category:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <li><Typography variant="body2"><strong>Output</strong> &mdash; Best Quality, Best Audio, and output formats (MP4, MKV, MP3, FLAC, M4A).</Typography></li>
            <li><Typography variant="body2"><strong>Subtitles</strong> &mdash; Write Subs, Embed Subs, English Subs, and Auto Subs.</Typography></li>
            <li><Typography variant="body2"><strong>Metadata</strong> &mdash; Embed Metadata, Embed Thumbnail, Write Description, Write Info JSON, Write Chapters.</Typography></li>
            <li><Typography variant="body2"><strong>Playback</strong> &mdash; No Playlist, No Overwrite, and Archive Mode (skips previously downloaded files).</Typography></li>
            <li><Typography variant="body2"><strong>Network</strong> &mdash; Rate Limit 5M (slows download), Ignore Errors, No Cert Check, and Retries 10.</Typography></li>
          </Box>
        </Box>
      ),
    },
    {
      icon: <CodeIcon sx={{ fontSize: 18, color: currentTheme.colors.success }} />,
      title: 'Templates',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              <strong>Load Template</strong>: pick a ready-made combination (e.g. Best Quality, Audio Only MP3, 1080p Max, 4K Ultra HD, With Subtitles, Thumbnail Embed, GIF Convert, Archive Mode). Selecting one fills in the arguments for you.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              The <strong>yt-dlp arguments</strong> text box shows the raw command-line arguments being used. You can edit it directly, or combine it with the Quick Options chips.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              A live <strong>command preview</strong> at the bottom shows the full yt-dlp command built from your choices before you download.
            </Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <SettingsIcon sx={{ fontSize: 18, color: currentTheme.colors.secondary }} />,
      title: 'Settings',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2"><strong>Appearance</strong>: switch between color themes.</Typography>
          </li>
          <li>
            <Typography variant="body2"><strong>Download Queue</strong>: set how many downloads run at the same time (1&ndash;10).</Typography>
          </li>
          <li>
            <Typography variant="body2"><strong>Speed Limit</strong>: cap the speed per download using presets or a custom KB/s or MB/s value (Unlimited by default).</Typography>
          </li>
          <li>
            <Typography variant="body2"><strong>Download Location</strong>: choose where files are saved.</Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Browser Cookies</strong>: pull login cookies from your browser (Firefox works automatically while logged in; Chrome/Edge/Brave/Opera/Vivaldi need the &ldquo;Get cookies.txt LOCALLY&rdquo; extension). This helps with YouTube 403 errors and age-restricted content. Use <strong>Test Cookies</strong> to verify.
            </Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <ActiveIcon sx={{ fontSize: 18, color: currentTheme.colors.info }} />,
      title: 'Active Downloads & History',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              <strong>Active Downloads</strong> (right sidebar) shows each file&rsquo;s progress bar, total size, smooth speed, and estimated time remaining.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">Use <strong>Cancel</strong> to stop a download. If a download is interrupted and can be resumed, a <strong>Resume</strong> button appears.</Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Download History</strong> lists your saved files in <strong>Video</strong> and <strong>Audio</strong> tabs. Use the delete icon to remove a file from disk, or the refresh icon to reload the list.
            </Typography>
          </li>
        </Box>
      ),
    },
    {
      icon: <FaqIcon sx={{ fontSize: 18, color: currentTheme.colors.error }} />,
      title: 'FAQ & Troubleshooting',
      body: (
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <li>
            <Typography variant="body2">
              <strong>&ldquo;Requested format is not available&rdquo;</strong>: the exact format you picked is unavailable at download time. Choose a recommended format from the table, or use Best Quality / a lower resolution preset &mdash; the app falls back automatically to the closest match.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Backend Offline</strong>: the status chip shows Offline. Start the server with <code>npm run dev</code> in the project root.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>403 / age-restricted / login-only errors</strong>: enable Browser Cookies in Settings and test them, then retry.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>File size seems incomplete</strong>: some sources (live streams / HLS) do not report their total size up front, so the size shown is an estimate updated as the download proceeds.
            </Typography>
          </li>
        </Box>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: `${currentTheme.colors.surface}ee`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${currentTheme.colors.border}`,
          borderRadius: 1.5,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}33, ${currentTheme.colors.secondary}33)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MenuBookIcon sx={{ color: currentTheme.colors.primary, fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            User Guide
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {sections.map((section, index) => (
          <Box key={section.title} sx={{ mb: index === sections.length - 1 ? 2 : 3 }}>
            {index > 0 && <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              {section.icon}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                {section.title}
              </Typography>
            </Box>
            {section.body}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserGuideDialog;
