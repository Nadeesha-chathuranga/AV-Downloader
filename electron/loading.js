/* Drives the loading splash shown while the app boots (and, from Phase 3,
   while yt-dlp/ffmpeg binaries are prepared). */
(function () {
  const statusEl = document.getElementById('status');
  const spinnerEl = document.getElementById('spinner');

  const setStatus = (text, kind) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.className = kind || '';
  };

  window.avDownloader.onBinaryStatus((data) => {
    if (!data) return;
    if (data.status === 'error') {
      setStatus(data.message || 'Something went wrong.', 'error');
      if (spinnerEl) spinnerEl.classList.add('hidden');
      return;
    }
    if (data.status === 'done') {
      setStatus(data.message || 'Ready.', 'ready');
      return;
    }
    // { status: 'downloading'|'preparing', message, percent? }
    const percent = data.percent != null ? ` ${Math.round(data.percent)}%` : '';
    setStatus((data.message || 'Preparing…') + percent);
  });
})();