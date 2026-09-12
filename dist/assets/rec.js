/* HiRec — high-quality voice recorder for ponpes.org
 * - getUserMedia: noiseSuppression + echoCancellation + autoGainControl + 48k
 * - Web Audio chain: highpass(80Hz) -> compressor -> MediaStreamDestination
 * - MediaRecorder forced to Opus @ 96kbps (small + clean speech)
 * - optional level meter via AnalyserNode
 */
window.HiRec = (function () {
  let ctx, stream, srcNode, dest, recorder, chunks, startTime, timer, onTick, onLevel, raf;
  const SUPPORTED = (function () {
    if (typeof MediaRecorder === 'undefined') return '';
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
    return c.find(x => MediaRecorder.isTypeSupported(x)) || '';
  })();

  async function start(opts) {
    opts = opts || {};
    onTick = opts.onTick; onLevel = opts.onLevel;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000, sampleSize: 16 }
    });
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    srcNode = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
    dest = ctx.createMediaStreamDestination();
    srcNode.connect(hp); hp.connect(comp); comp.connect(dest);
    if (onLevel) {
      const an = ctx.createAnalyser(); an.fftSize = 256; comp.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        onLevel(Math.min(1, Math.sqrt(s / buf.length) * 2.2));
        if (srcNode) raf = requestAnimationFrame(loop);
      };
      loop();
    }
    const mime = SUPPORTED || undefined;
    recorder = new MediaRecorder(dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } : { audioBitsPerSecond: 96000 });
    chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.start();
    startTime = Date.now();
    if (onTick) timer = setInterval(() => onTick((Date.now() - startTime) / 1000), 200);
    return { mime: recorder.mimeType || SUPPORTED || 'audio/webm' };
  }

  function stop() {
    return new Promise(resolve => {
      clearInterval(timer);
      if (raf) cancelAnimationFrame(raf);
      recorder.onstop = () => {
        const type = recorder.mimeType || SUPPORTED || 'audio/webm';
        const blob = new Blob(chunks, { type });
        stream.getTracks().forEach(t => t.stop());
        srcNode = null;
        resolve({ blob, url: URL.createObjectURL(blob), mime: type, size: blob.size });
      };
      recorder.stop();
    });
  }
  return { start, stop, get supported() { return !!SUPPORTED; } };
})();
