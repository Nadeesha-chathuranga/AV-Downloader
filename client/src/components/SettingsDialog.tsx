import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Slider,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Queue as QueueIcon,
  Palette as PaletteIcon,
  Speed as SpeedIcon,
  Cookie as CookieIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
  FolderOpen as FolderOpenIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';
import { apiUrl } from '../config';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AppSettings {
  maxConcurrentDownloads: number;
  downloadSpeedLimit: number;
  cookieBrowser: string;
  cookieFilePath: string;
  downloadsDir: string;
}

const SPEED_PRESETS = [
  { value: 0, label: 'Unlimited' },
  { value: 256000, label: '250 KB/s' },
  { value: 512000, label: '500 KB/s' },
  { value: 768000, label: '750 KB/s' },
  { value: 1048576, label: '1 MB/s' },
  { value: 2097152, label: '2 MB/s' },
  { value: 4194304, label: '4 MB/s' },
  { value: 6291456, label: '6 MB/s' },
  { value: 8388608, label: '8 MB/s' },
  { value: 10485760, label: '10 MB/s' },
  { value: 20971520, label: '20 MB/s' },
  { value: 31457280, label: '30 MB/s' },
  { value: 52428800, label: '50 MB/s' },
  { value: 104857600, label: '100 MB/s' },
  { value: -1, label: 'Manual' },
];

const MANUAL_INDEX = SPEED_PRESETS.length - 1;

const formatSpeed = (bytesPerSec: number) => {
  if (bytesPerSec === 0) return 'Unlimited';
  if (bytesPerSec < 1048576) return `${Math.round(bytesPerSec / 1024)} KB/s`;
  const mb = bytesPerSec / 1048576;
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB/s`;
};

const getSpeedIndex = (bytesPerSec: number) => {
  const idx = SPEED_PRESETS.findIndex((p) => p.value === bytesPerSec);
  return idx >= 0 ? idx : MANUAL_INDEX;
};

const bytesToUnitValue = (bytes: number) => {
  if (bytes >= 1048576) return { value: parseFloat((bytes / 1048576).toFixed(2)), unit: 'MB' };
  return { value: Math.round(bytes / 1024), unit: 'KB' };
};

const unitToBytes = (value: number, unit: string) => {
  if (unit === 'MB') return Math.round(value * 1048576);
  return Math.round(value * 1024);
};

const QUICK_PRESETS = [0, 1048576, 5242880, 10485760, 52428800];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { currentTheme, setTheme } = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>({
    maxConcurrentDownloads: 3,
    downloadSpeedLimit: 0,
    cookieBrowser: '',
    cookieFilePath: '',
    downloadsDir: '',
  });
  const [speedIndex, setSpeedIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [manualUnit, setManualUnit] = useState<'KB' | 'MB'>('MB');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detectedBrowsers, setDetectedBrowsers] = useState<string[]>([]);
  const [cookieTestStatus, setCookieTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cookieTestMsg, setCookieTestMsg] = useState('');
  // Tracks the "Settings saved" toast timer so we never fire setState after
  // unmount (or stack multiple timers on rapid saves).
  const savedTimerRef = useRef<number | null>(null);
  // Clipboard link detection ("Share -> Copy link") — persisted locally and
  // mirrored to the Electron main process, which owns the polling loop.
  const [clipboardWatch, setClipboardWatchState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('avd_clipboard_watch') !== '0';
    } catch {
      return true;
    }
  });
  const toggleClipboardWatch = () => {
    setClipboardWatchState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('avd_clipboard_watch', next ? '1' : '0');
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  };
  useEffect(() => {
    window.avDownloader?.setClipboardWatch(clipboardWatch);
  }, [clipboardWatch]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current != null) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/download/queue`);
      const limit = res.data.downloadSpeedLimit ?? 0;
      setSettings({
        maxConcurrentDownloads: res.data.maxConcurrent || 3,
        downloadSpeedLimit: limit,
        cookieBrowser: res.data.cookieBrowser || '',
        cookieFilePath: res.data.cookieFilePath || '',
        downloadsDir: res.data.downloadsDir || '',
      });
      const idx = getSpeedIndex(limit);
      setSpeedIndex(idx);
      if (idx === MANUAL_INDEX) {
        const { value, unit } = bytesToUnitValue(limit);
        setManualInput(value.toString());
        setManualUnit(unit as 'KB' | 'MB');
      } else {
        setManualInput('');
        setManualUnit('MB');
      }
    } catch {}
  }, [apiUrl]);

  useEffect(() => {
    if (open) {
      fetchSettings();
      setSaved(false);
      setCookieTestStatus('idle');
      axios.get(`${apiUrl}/download/browsers`).then(res => {
        setDetectedBrowsers(res.data.browsers || []);
      }).catch(() => setDetectedBrowsers([]));
    }
  }, [open, fetchSettings, apiUrl]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${apiUrl}/download/queue/settings`, {
        maxConcurrentDownloads: settings.maxConcurrentDownloads,
        downloadSpeedLimit: settings.downloadSpeedLimit,
        cookieBrowser: settings.cookieBrowser,
        cookieFilePath: settings.cookieFilePath,
        downloadsDir: settings.downloadsDir,
      });
      setSaved(true);
      if (savedTimerRef.current != null) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  const handleSliderChange = (_: any, value: number | number[]) => {
    const idx = value as number;
    setSpeedIndex(idx);
    if (idx < MANUAL_INDEX) {
      setSettings((prev) => ({ ...prev, downloadSpeedLimit: SPEED_PRESETS[idx].value }));
      setManualInput('');
    }
  };

  const handleManualSubmit = () => {
    const num = parseFloat(manualInput);
    if (!isNaN(num) && num > 0) {
      const bytes = unitToBytes(num, manualUnit);
      setSettings((prev) => ({ ...prev, downloadSpeedLimit: bytes }));
    }
  };

  const BROWSER_LABELS: Record<string, string> = {
    chrome: 'Google Chrome',
    edge: 'Microsoft Edge',
    firefox: 'Mozilla Firefox',
    brave: 'Brave',
    opera: 'Opera',
    vivaldi: 'Vivaldi',
  };

  const CHROMIUM_BROWSERS = ['chrome', 'edge', 'brave', 'opera', 'vivaldi'];

  const handleTestCookies = async () => {    setCookieTestStatus('testing');
    setCookieTestMsg('');
    try {
      const res = await axios.post(`${apiUrl}/download/cookie-test`, {
        cookieBrowser: settings.cookieBrowser,
        cookieFilePath: settings.cookieFilePath,
      });
      if (res.data.success) {
        setCookieTestStatus('success');
        setCookieTestMsg(res.data.message);
      } else {
        setCookieTestStatus('error');
        setCookieTestMsg(res.data.error || 'Test failed');
      }
    } catch (err: any) {
      setCookieTestStatus('error');
      setCookieTestMsg(err.response?.data?.error || err.message || 'Test failed');
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
            <SettingsIcon sx={{ color: currentTheme.colors.primary, fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Theme Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PaletteIcon sx={{ fontSize: 18, color: currentTheme.colors.secondary }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Appearance
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Theme</InputLabel>
            <Select
              value={currentTheme.id}
              label="Theme"
              onChange={(e) => setTheme(e.target.value as string)}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 280, overflowY: 'auto' },
                },
              }}
            >
              {themes.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.primary }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.secondary }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: t.colors.background }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.name}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Queue Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <QueueIcon sx={{ fontSize: 18, color: currentTheme.colors.warning }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Download Queue
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
            Max concurrent downloads: <strong>{settings.maxConcurrentDownloads}</strong>
          </Typography>
          <Slider
            value={settings.maxConcurrentDownloads}
            onChange={(_, v) => setSettings((prev) => ({ ...prev, maxConcurrentDownloads: v as number }))}
            min={1}
            max={10}
            step={1}
            marks
            sx={{
              color: currentTheme.colors.warning,
              '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.65rem' },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Speed Limit Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <SpeedIcon sx={{ fontSize: 18, color: currentTheme.colors.info }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Speed Limit
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
            Per-download speed limit: <strong>{formatSpeed(settings.downloadSpeedLimit)}</strong>
          </Typography>
          <Slider
            value={speedIndex}
            onChange={handleSliderChange}
            min={0}
            max={MANUAL_INDEX}
            step={1}
            marks={SPEED_PRESETS.map((p, i) => ({
              value: i,
              label: '',
            }))}
            sx={{
              color: currentTheme.colors.info,
              '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.6rem' },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              Unlimited
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              Manual
            </Typography>
          </Box>

          {/* Quick preset buttons */}
          <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
            {QUICK_PRESETS.map((presetValue) => (
              <Button
                key={presetValue}
                size="small"
                variant={settings.downloadSpeedLimit === presetValue && speedIndex < MANUAL_INDEX ? 'contained' : 'outlined'}
                onClick={() => {
                  const idx = getSpeedIndex(presetValue);
                  setSpeedIndex(idx);
                  setSettings((prev) => ({ ...prev, downloadSpeedLimit: presetValue }));
                  setManualInput('');
                }}
                sx={{
                  fontSize: '0.65rem',
                  minWidth: 0,
                  py: 0.25,
                  px: 1,
                  textTransform: 'none',
                  fontWeight: settings.downloadSpeedLimit === presetValue && speedIndex < MANUAL_INDEX ? 700 : 400,
                }}
              >
                {formatSpeed(presetValue)}
              </Button>
            ))}
          </Box>

          {/* Manual input */}
          {speedIndex === MANUAL_INDEX && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, background: `${currentTheme.colors.background}88`, border: `1px solid ${currentTheme.colors.border}` }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mb: 1, display: 'block' }}>
                Enter custom speed limit per download:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onBlur={handleManualSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                  placeholder="e.g. 3.5"
                  inputProps={{ min: 0, step: 0.1 }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0.75,
                      fontSize: '0.85rem',
                    },
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={manualUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as 'KB' | 'MB';
                      if (manualInput) {
                        const num = parseFloat(manualInput);
                        if (!isNaN(num) && num > 0) {
                          const currentBytes = unitToBytes(num, manualUnit);
                          if (newUnit === 'MB') {
                            setManualInput((currentBytes / 1048576).toFixed(2));
                          } else {
                            setManualInput(Math.round(currentBytes / 1024).toString());
                          }
                        }
                      }
                      setManualUnit(newUnit);
                    }}
                    sx={{ borderRadius: 0.75, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="KB">KB/s</MenuItem>
                    <MenuItem value="MB">MB/s</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleManualSubmit}
                  disabled={!manualInput || isNaN(parseFloat(manualInput)) || parseFloat(manualInput) <= 0}
                  sx={{
                    minWidth: 0,
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                >
                  Set
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Sharing & Integration Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <LinkIcon sx={{ fontSize: 18, color: currentTheme.colors.info }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Sharing &amp; Integration
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={clipboardWatch}
                onChange={toggleClipboardWatch}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: currentTheme.colors.secondary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: currentTheme.colors.secondary },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Detect copied video links</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  When you copy a video URL, AV Downloader auto-fills it and fetches its info.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Works in the desktop app.
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', ml: 0, '& .MuiFormControlLabel-label': { mt: 0.25 } }}
          />
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Download Location Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <FolderOpenIcon sx={{ fontSize: 18, color: currentTheme.colors.primary }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Download Location
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>
            Downloads are saved here. Files are split automatically to <strong>Video</strong> and <strong>Audio</strong>. Default: <strong>C:\Users\You\Downloads\AV Downloader</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={settings.downloadsDir}
              onChange={(e) => setSettings((prev) => ({ ...prev, downloadsDir: e.target.value }))}
              placeholder="Paste download location here"
              sx={{
                '& .MuiOutlinedInput-root': { height: 40, borderRadius: 0.75, fontSize: '0.85rem' },
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' },
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor: currentTheme.colors.border, mb: 3 }} />

        {/* Browser Cookies Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CookieIcon sx={{ fontSize: 18, color: currentTheme.colors.success }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              Browser Cookies
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>
            Pull login cookies from your browser to bypass download restrictions (e.g. YouTube 403 errors, age-restricted content).
          </Typography>

          {/* Browser selector — only detected browsers */}
          <FormControl fullWidth size="small">
            <InputLabel>Browser</InputLabel>
            <Select
              value={settings.cookieBrowser}
              label="Browser"
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, cookieBrowser: e.target.value, cookieFilePath: '' }));
                setCookieTestStatus('idle');
              }}
            >
              <MenuItem value="">
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Disabled (no cookies)</Typography>
              </MenuItem>
              {detectedBrowsers.map((b) => (
                <MenuItem key={b} value={b}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {BROWSER_LABELS[b] || b}
                    </Typography>
                    {b === 'firefox' && (
                      <Box sx={{
                        ml: 'auto',
                        px: 0.75,
                        py: 0.15,
                        borderRadius: 0.5,
                        background: `${currentTheme.colors.success}22`,
                        border: `1px solid ${currentTheme.colors.success}55`,
                      }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: currentTheme.colors.success }}>
                          RECOMMENDED
                        </Typography>
                      </Box>
                    )}
                    {CHROMIUM_BROWSERS.includes(b) && (
                      <Box sx={{
                        ml: 'auto',
                        px: 0.75,
                        py: 0.15,
                        borderRadius: 0.5,
                        background: `${currentTheme.colors.warning}22`,
                        border: `1px solid ${currentTheme.colors.warning}55`,
                      }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: currentTheme.colors.warning }}>
                          REQUIRES EXPORT
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Firefox success message */}
          {settings.cookieBrowser === 'firefox' && (
            <Alert severity="success" sx={{ mt: 1.5, borderRadius: 1, fontSize: '0.8rem', background: `${currentTheme.colors.success}11`, border: `1px solid ${currentTheme.colors.success}33` }}>
              <strong>Firefox selected.</strong> Just make sure you're logged in to the site you want to download from. Works while the browser is open.
            </Alert>
          )}

          {/* Chromium guided setup */}
          {CHROMIUM_BROWSERS.includes(settings.cookieBrowser) && (
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, background: `${currentTheme.colors.background}88`, border: `1px solid ${currentTheme.colors.border}` }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                How to set up {BROWSER_LABELS[settings.cookieBrowser]} cookies:
              </Typography>

              {/* Step 1 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{
                  minWidth: 22, height: 22, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.15,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>1</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Install the <strong>"Get cookies.txt LOCALLY"</strong> extension:
                  </Typography>
                  <Button
                    size="small"
                    href="https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                    target="_blank"
                    rel="noopener"
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{ fontSize: '0.75rem', textTransform: 'none', mt: 0.5, px: 0, minWidth: 0 }}
                  >
                    Open Chrome Web Store
                  </Button>
                </Box>
              </Box>

              {/* Step 2 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{
                  minWidth: 22, height: 22, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.15,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>2</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Visit the site you want to download from (e.g. <strong>youtube.com</strong>) and log in.
                </Typography>
              </Box>

              {/* Step 3 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{
                  minWidth: 22, height: 22, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.15,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>3</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Click the extension icon in your toolbar, then click <strong>"Export"</strong> and save the file.
                </Typography>
              </Box>

              {/* Step 4 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                <Box sx={{
                  minWidth: 22, height: 22, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.15,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>4</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Paste the saved file path below:
                </Typography>
              </Box>

              <Box sx={{ ml: 3.25 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={settings.cookieFilePath}
                  onChange={(e) => {
                    setSettings((prev) => ({ ...prev, cookieFilePath: e.target.value, cookieBrowser: '' }));
                    setCookieTestStatus('idle');
                  }}
                  placeholder="C:\Users\You\Downloads\cookies.txt"
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 0.75, fontSize: '0.85rem' },
                    '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Cookie file path — always visible when no browser selected or as alternative */}
          {!settings.cookieBrowser && (
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, background: `${currentTheme.colors.background}88`, border: `1px solid ${currentTheme.colors.border}` }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 1, display: 'block' }}>
                Or provide a cookies.txt file path (Netscape format):
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={settings.cookieFilePath}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, cookieFilePath: e.target.value, cookieBrowser: '' }));
                  setCookieTestStatus('idle');
                }}
                placeholder="C:\Users\You\cookies.txt"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 0.75, fontSize: '0.85rem' },
                  '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' },
                }}
              />
            </Box>
          )}

          {/* Test button + status */}
          {(settings.cookieBrowser || settings.cookieFilePath) && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={cookieTestStatus === 'testing' ? undefined : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                onClick={handleTestCookies}
                disabled={cookieTestStatus === 'testing'}
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 0.9,
                  letterSpacing: 0.2,
                  '&:hover': {
                    boxShadow: `0 6px 22px ${currentTheme.colors.primary}55`,
                  },
                  '&.Mui-disabled': {
                    background: `${currentTheme.colors.surfaceAlt}`,
                    color: 'text.secondary',
                  },
                }}
              >
                {cookieTestStatus === 'testing' ? 'Testing cookies...' : 'Test Cookies'}
              </Button>
              {(cookieTestStatus === 'success' || cookieTestStatus === 'error') && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                  {cookieTestStatus === 'success' ? (
                    <CheckCircleIcon sx={{ fontSize: 16, mt: 0.15, flexShrink: 0, color: currentTheme.colors.success }} />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 16, mt: 0.15, flexShrink: 0, color: currentTheme.colors.error || '#f44336' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: cookieTestStatus === 'success' ? currentTheme.colors.success : currentTheme.colors.error || '#f44336',
                      fontWeight: 600,
                    }}
                  >
                    {cookieTestMsg}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* No browsers detected */}
          {detectedBrowsers.length === 0 && (
            <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1, fontSize: '0.8rem', background: `${currentTheme.colors.warning}11`, border: `1px solid ${currentTheme.colors.warning}33` }}>
              No browsers detected. You can still use a cookies.txt file path below.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{
            background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
            fontWeight: 600,
            px: 3,
          }}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
