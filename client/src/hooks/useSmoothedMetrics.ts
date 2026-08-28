import { useEffect, useRef, useState } from 'react';
import { DownloadInfo } from '../contexts/SocketContext';

const parseSpeed = (value: string | undefined | null): number | null => {
  const m = /^([\d.]+)\s*([KMG]i?B)\/s$/i.exec((value || '').trim());
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mult: Record<string, number> = {
    KB: 1024,
    KIB: 1024,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
  };
  return mult[unit] ? num * mult[unit] : null;
};

const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec < 0 || !isFinite(bytesPerSec)) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  const units = ['KiB/s', 'MiB/s', 'GiB/s', 'TiB/s'];
  let v = bytesPerSec;
  let i = -1;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

const parseEtaSeconds = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const str = value.trim();
  if (/^Unknown$/i.test(str)) return null;
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  let seconds = 0;
  for (const part of parts) {
    seconds = seconds * 60 + part;
  }
  return seconds;
};

const formatEta = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const SMOOTH_ALPHA = 0.5;
const REFRESH_MS = 250;

/**
 * Smoothly animates the displayed speed and ETA for an active download.
 *
 * The raw yt-dlp values arrive ~1x/sec on the socket. If we rendered them
 * directly (or eased toward them with a timer that restarts on every event)
 * the number holds still then jumps. Instead we keep ONE persistent animation
 * loop per mount that glides toward the latest target every ~250ms, so the
 * readout moves continuously between the occasional socket updates.
 */
export const useSmoothedMetrics = (download: DownloadInfo) => {
  const isActive =
    download.status === 'downloading' || download.status === 'resuming';

  // Latest raw targets, written by socket updates and read by the loop.
  const speedTargetRef = useRef<number | null>(null);
  const etaTargetRef = useRef<number | null>(null);
  // Animated (smoothed) values, driven by the persistent loop.
  const speedSmoothRef = useRef<number | null>(null);
  const etaSmoothRef = useRef<number | null>(null);
  const lastEtaRawRef = useRef<string>('');

  const [display, setDisplay] = useState<{ speed?: string; eta?: string }>(
    isActive ? {} : { speed: download.speed, eta: download.eta }
  );

  // Track the latest raw values without touching the animation loop.
  useEffect(() => {
    if (!isActive) return;
    const rawSpeed = parseSpeed(download.speed);
    if (rawSpeed && rawSpeed > 0) speedTargetRef.current = rawSpeed;

    const etaSeconds = parseEtaSeconds(download.eta);
    if (etaSeconds != null) {
      lastEtaRawRef.current = download.eta || '';
      etaTargetRef.current = etaSeconds;
      // ETA counts down; snap current when the real ETA has dropped well ahead
      // of the animation so we never lag behind the true countdown.
      if (etaSmoothRef.current != null && etaSmoothRef.current > etaSeconds + 2) {
        etaSmoothRef.current = etaSeconds;
      }
    }
  }, [isActive, download.speed, download.eta]);

  // Persistent animation loop — runs once per mount, gliding toward targets.
  useEffect(() => {
    if (!isActive) {
      setDisplay({ speed: download.speed, eta: download.eta });
      return;
    }
    if (speedSmoothRef.current == null && speedTargetRef.current != null) {
      speedSmoothRef.current = speedTargetRef.current;
    }
    if (etaSmoothRef.current == null && etaTargetRef.current != null) {
      etaSmoothRef.current = etaTargetRef.current;
    }

    const timer = setInterval(() => {
      const next: { speed?: string; eta?: string } = {};

      const speedTarget = speedTargetRef.current;
      if (speedTarget != null) {
        let sm = speedSmoothRef.current;
        if (sm == null) {
          sm = speedTarget;
        } else {
          sm += SMOOTH_ALPHA * (speedTarget - sm);
        }
        speedSmoothRef.current = sm;
        next.speed = formatSpeed(sm);
      }

      const etaTarget = etaTargetRef.current;
      if (etaTarget != null) {
        let es = etaSmoothRef.current;
        if (es == null) {
          es = etaTarget;
        } else {
          es += SMOOTH_ALPHA * (etaTarget - es);
        }
        etaSmoothRef.current = es;
        next.eta = formatEta(es);
      } else if (lastEtaRawRef.current && lastEtaRawRef.current !== 'Unknown') {
        // No parseable ETA yet — show the latest raw server value.
        next.eta = lastEtaRawRef.current;
      }

      setDisplay((prev) => (prev.speed === next.speed && prev.eta === next.eta ? prev : next));
    }, REFRESH_MS);

    return () => clearInterval(timer);
    // Deliberately stable: only (re)start when active state flips or identity changes.
  }, [isActive, download.id]);

  // Keep non-active items reflecting their final raw values.
  useEffect(() => {
    if (!isActive) {
      speedTargetRef.current = null;
      etaTargetRef.current = null;
      speedSmoothRef.current = null;
      etaSmoothRef.current = null;
      lastEtaRawRef.current = '';
      setDisplay({ speed: download.speed, eta: download.eta });
    }
  }, [isActive, download.speed, download.eta]);

  return display;
};
