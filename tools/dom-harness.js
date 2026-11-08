/**
 * Mediu DOM pentru testarea bundle-ului SuperManager în Node (jsdom).
 *
 * Bundle-ul e o aplicație de browser: are nevoie de WebAudio, canvas 2D,
 * matchMedia, requestAnimationFrame, fullscreen. jsdom nu le are, deci le
 * stub-uim ca testul să verifice logica jocului, nu capabilitățile mediului.
 */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const HTML_FILE = path.join(__dirname, '..', 'public', 'index.html');
const NOISE = /Not implemented|Could not parse CSS|Error: Not implemented/i;

/** AudioParam / nod WebAudio „acceptă orice metodă, ține minte orice valoare". */
function audioParam() {
  return new Proxy(
    { value: 1 },
    {
      get: (target, key) => {
        if (key in target) return target[key];
        if (typeof key === 'string' && /^(set|linear|exponential|cancel|get)/.test(key)) return () => {};
        return undefined;
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    }
  );
}

function audioNode() {
  const self = {
    connect: () => self,
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    type: 'sine',
    buffer: null,
    gain: audioParam(),
    frequency: audioParam(),
    detune: audioParam(),
    Q: audioParam(),
    pan: audioParam(),
    playbackRate: audioParam(),
    threshold: audioParam(),
    knee: audioParam(),
    ratio: audioParam(),
    attack: audioParam(),
    release: audioParam(),
  };
  return self;
}

class StubAudioContext {
  createGain() { return audioNode(); }
  createOscillator() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createDynamicsCompressor() { return audioNode(); }
  createBufferSource() { return audioNode(); }
  createStereoPanner() { return audioNode(); }
  createConvolver() { return audioNode(); }
  createDelay() { return audioNode(); }
  createWaveShaper() { return audioNode(); }
  createAnalyser() { return audioNode(); }
  createChannelMerger() { return audioNode(); }
  createChannelSplitter() { return audioNode(); }
  createBuffer(channels, length, rate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate: rate || 44100,
      getChannelData: () => new Float32Array(length),
    };
  }
  get destination() { return audioNode(); }
  get currentTime() { return 0; }
  get sampleRate() { return 44100; }
  get state() { return 'running'; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

/** Context canvas 2D care înghite orice apel de desenare (nu verificăm pixelii). */
function canvas2dContext(canvas) {
  const gradient = () => ({ addColorStop() {} });
  const handler = {
    get(target, key) {
      if (key === 'canvas') return canvas;
      if (key === 'measureText') return (text) => ({ width: String(text).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (key === 'getImageData') {
        return (x, y, w, h) => ({ data: new Uint8ClampedArray(4 * Math.max(1, w) * Math.max(1, h)), width: w, height: h });
      }
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') return gradient;
      if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (key === 'getLineDash') return () => [];
      if (key === 'isPointInPath' || key === 'isPointInStroke') return () => false;
      if (key in target) return target[key];
      return typeof key === 'string' ? () => undefined : undefined;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  };
  return new Proxy({}, handler);
}

function installBrowserStubs(window) {
  window.AudioContext = StubAudioContext;
  window.webkitAudioContext = StubAudioContext;

  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });

  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  window.HTMLCanvasElement.prototype.getContext = function getContext(kind) {
    if (kind === '2d') {
      this.__ctx2d = this.__ctx2d || canvas2dContext(this);
      return this.__ctx2d;
    }
    return null; // WebGL nu e disponibil — jocul are fallback 2D
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

  // jsdom nu implementează Fullscreen API
  window.HTMLElement.prototype.requestFullscreen = function requestFullscreen() { return Promise.resolve(); };
  window.document.exitFullscreen = () => Promise.resolve();

  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  }
  if (!window.scrollTo) window.scrollTo = () => {};
  if (!window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {};
}

/**
 * Pornește aplicația într-un DOM și întoarce unelte pentru scenarii.
 * @returns {Promise<{window, document, errors, text(), buttons(), click(), labels(), sleep(), close()}>}
 */
async function launch({ bootTimeout = 20000, seed = null } = {}) {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const errors = [];
  const virtualConsole = new VirtualConsole();

  const record = (raw) => {
    const message = String(raw && raw.message ? raw.message : raw);
    if (NOISE.test(message)) return;
    errors.push(message);
  };

  virtualConsole.on('jsdomError', record);
  virtualConsole.on('error', (...args) => record(args.map(String).join(' ')));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost:3000/',
    virtualConsole,
    beforeParse: (window) => {
      installBrowserStubs(window);
      // Seed util pentru testele de storage: pornim aplicația cu o salvare deja existentă.
      if (seed) for (const [key, value] of Object.entries(seed)) window.localStorage.setItem(key, value);
    },
  });

  const { window } = dom;
  const { document } = window;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Textul chiar randat: fără sursa <script>, fără CSS-ul inline.
  const text = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const buttons = () => [...document.querySelectorAll('button')];
  const labels = () =>
    buttons()
      .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((label) => label && label.length < 80);
  const click = (target) => {
    const matcher = typeof target === 'function' ? target : (label) => target.test ? target.test(label) : label === target;
    const button = buttons().find((b) => matcher((b.textContent || '').replace(/\s+/g, ' ').trim()));
    if (!button) return false;
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  };
  const hasText = (pattern) => (pattern instanceof RegExp ? pattern.test(text()) : text().includes(pattern));
  const waitFor = async (pattern, timeout = 5000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (hasText(pattern)) return true;
      if (errors.length) return false;
      await sleep(50);
    }
    return hasText(pattern);
  };

  const root = document.getElementById('root');
  if (!root) throw new Error('HTML-ul nu conține #root');

  const deadline = Date.now() + bootTimeout;
  while (Date.now() < deadline && root.childElementCount === 0 && errors.length === 0) {
    await sleep(100);
  }

  return {
    window,
    document,
    errors,
    root,
    text,
    buttons,
    labels,
    click,
    hasText,
    waitFor,
    sleep,
    close: () => dom.window.close(),
  };
}

module.exports = { launch, installBrowserStubs };
