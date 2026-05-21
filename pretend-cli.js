(function (global) {
  'use strict';

  const THEMES = {
    dark:  { bg: '#1a1a1a', fg: '#f0f0f0', prompt: '#00ff41', cursor: '#f0f0f0' },
    light: { bg: '#f5f5f5', fg: '#1a1a1a', prompt: '#0066cc', cursor: '#1a1a1a' },
    green: { bg: '#0d0d0d', fg: '#00ff41', prompt: '#00ff41', cursor: '#00ff41' },
    amber: { bg: '#0d0800', fg: '#ffb000', prompt: '#ffb000', cursor: '#ffb000' },
  };

  const COMMAND_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

  let _container    = null;
  let _options      = {};
  let _originalHTML = '';
  let _styleEl      = null;
  let _toggleEl     = null;
  let _queue        = [];
  let _isAnimating  = false;
  let _skipAnimation = false;
  let _focusedLinkIndex = -1;
  let _keyHandler   = null;
  let _navigationBound = false;
  let _skipBound       = false;
  let _skipHandler     = null;
  let _navHandler      = null;
  let _logoRendered = false;
  let _currentMode  = 'cli';
  let _bgVideoEl    = null;

  // ─── Public API ──────────────────────────────────────────────

  function init(options) {
    _options = Object.assign({
      target:                 '#terminal-zone',
      theme:                  'dark',
      image:                  'ascii',
      imageWidth:             60,
      navigation:             'inline',
      logo:                   null,
      defaultMode:            'cli',
      backgroundVideo:        null,
      backgroundVideoOpacity: 0.3,
      backgroundVideoOverlay: 0.5,
      imageDisplayWidth:      '100%',
    }, options);

    try {
      _container = document.querySelector(_options.target);
    } catch (e) {
      console.error('[PretendCLI] Invalid target selector:', _options.target);
      return;
    }
    if (!_container) return;

    _originalHTML = _container.innerHTML;

    addToggleButtons();

    if (_options.defaultMode === 'gui') {
      _currentMode = 'gui';
      updateToggleButtons();
    } else {
      startCLI();
    }
  }

  function destroy() {
    _revertToGUI();
    if (_toggleEl) { _toggleEl.remove(); _toggleEl = null; }
    const ts = document.querySelector('#pcli-toggle-styles');
    if (ts) ts.remove();
    _container = null;
  }

  // ─── Mode switching ───────────────────────────────────────────

  function startCLI() {
    if (!_container) return;
    _currentMode      = 'cli';
    _logoRendered     = false;
    _skipAnimation    = false;
    _navigationBound  = false;
    _skipBound        = false;

    // keyboard listener cleanup
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }

    addBackgroundVideo();
    injectStyles();
    buildQueue();
    _container.innerHTML = '';
    // innerHTML クリア後にトグルボタンを再appended（target: 'body' 対策）
    if (_toggleEl) document.body.appendChild(_toggleEl);
    runQueue();
    bindSkipOnInteraction();
    if (_options.navigation === 'inline') bindNavigation();
    updateToggleButtons();
  }

  function startGUI() {
    if (_currentMode === 'gui') return;
    _revertToGUI();
    _currentMode = 'gui';
    updateToggleButtons();
  }

  function _revertToGUI() {
    _skipAnimation = true;

    if (_container) {
      _container.innerHTML = _originalHTML;
      _container.removeAttribute('style');
    }
    if (_styleEl) { _styleEl.remove(); _styleEl = null; }
    removeBackgroundVideo();
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }

    if (_skipHandler && _container) {
      _container.removeEventListener('click', _skipHandler);
      _container.removeEventListener('keydown', _skipHandler);
      _skipHandler = null;
    }
    if (_navHandler && _container) {
      _container.removeEventListener('click', _navHandler);
      _navHandler = null;
    }

    _queue           = [];
    _isAnimating     = false;
    _skipAnimation   = false;
    _navigationBound = false;
    _skipBound       = false;
    _logoRendered    = false;
  }

  // ─── Toggle buttons ───────────────────────────────────────────

  function addToggleButtons() {
    // style（両モードで常に有効）
    if (!document.querySelector('#pcli-toggle-styles')) {
      const s = document.createElement('style');
      s.id = 'pcli-toggle-styles';
      s.textContent = `
        .pcli-toggle {
          position: fixed;
          bottom: 20px;
          right: 24px;
          display: flex;
          gap: 4px;
          z-index: 9999;
        }
        .pcli-toggle-btn {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          padding: 8px 16px;
          cursor: pointer;
          border: 1px solid #555;
          background: #1a1a1a;
          color: #666;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .pcli-toggle-btn:hover {
          opacity: 1;
          color: #aaa;
        }
        .pcli-toggle-btn.pcli-active {
          color: #f0f0f0;
          border-color: #f0f0f0;
          opacity: 1;
        }
      `;
      document.head.appendChild(s);
    }

    const wrap = document.createElement('div');
    wrap.className = 'pcli-toggle';

    const guiBtn = document.createElement('button');
    guiBtn.className = 'pcli-toggle-btn pcli-toggle-gui';
    guiBtn.textContent = 'GUI';
    guiBtn.addEventListener('click', startGUI);

    const cliBtn = document.createElement('button');
    cliBtn.className = 'pcli-toggle-btn pcli-toggle-cli';
    cliBtn.textContent = 'CLI';
    cliBtn.addEventListener('click', function () {
      if (_currentMode !== 'cli') startCLI();
    });

    wrap.appendChild(guiBtn);
    wrap.appendChild(cliBtn);
    document.body.appendChild(wrap);
    _toggleEl = wrap;

    updateToggleButtons();
  }

  function updateToggleButtons() {
    if (!_toggleEl) return;
    _toggleEl.querySelector('.pcli-toggle-gui').classList.toggle('pcli-active', _currentMode === 'gui');
    _toggleEl.querySelector('.pcli-toggle-cli').classList.toggle('pcli-active', _currentMode === 'cli');
  }

  // ─── Styles ───────────────────────────────────────────────────

  function injectStyles() {
    if (_styleEl) { _styleEl.remove(); _styleEl = null; }
    const theme = THEMES[_options.theme] || THEMES.dark;
    const sel   = _options.target;

    _styleEl = document.createElement('style');
    _styleEl.id = 'pretend-cli-styles';
    _styleEl.textContent = `
      ${sel} {
        background: ${_options.backgroundVideo ? hexToRgba(theme.bg, 0.6) : theme.bg};
        color: ${theme.fg};
        position: relative;
        z-index: 1;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        line-height: 1.8;
        padding: 24px;
        box-sizing: border-box;
        overflow-y: auto;
        word-break: break-all;
      }
      ${sel} *, ${sel} *::before, ${sel} *::after {
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 14px !important;
        font-weight: normal !important;
        font-style: normal !important;
        color: ${theme.fg} !important;
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-shadow: none !important;
        text-decoration: none !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
        line-height: 1.8 !important;
        float: none !important;
        position: static !important;
        opacity: 1 !important;
        max-width: 100% !important;
      }
      ${sel} .pcli-line { display: block; }
      ${sel} .pcli-command::before {
        content: '$ ';
        color: ${theme.prompt} !important;
      }
      ${sel} .pcli-output { opacity: 0.9 !important; }
      ${sel} ul, ${sel} ol { list-style: none !important; }
      ${sel} li::before {
        content: '> ';
        color: ${theme.prompt} !important;
      }
      ${sel} a {
        color: ${theme.prompt} !important;
        text-decoration: underline !important;
        cursor: pointer !important;
      }
      ${sel} pre { white-space: pre; margin: 8px 0; }
      ${sel} .pcli-ascii-img {
        font-size: 5px !important;
        line-height: 1.1 !important;
        letter-spacing: 1px !important;
      }
      ${sel} .pcli-video-label {
        color: ${theme.prompt} !important;
        font-size: 12px !important;
        opacity: 0.8 !important;
        margin-bottom: 2px !important;
      }
      ${sel} .pcli-video-wrapper {
        display: inline-block !important;
        border: 1px solid ${theme.prompt} !important;
        padding: 4px !important;
        opacity: 0.9 !important;
      }
      ${sel} .pcli-video {
        display: block !important;
        max-width: 100% !important;
      }
      ${sel} img.pcli-normal {
        max-width: ${typeof _options.imageDisplayWidth === 'number' ? _options.imageDisplayWidth + 'px' : _options.imageDisplayWidth};
        display: block;
        margin: 8px 0;
        border: 1px solid ${theme.fg};
        padding: 4px;
        box-sizing: border-box;
      }
      ${sel} .pcli-cursor {
        display: inline-block !important;
        width: 8px !important;
        height: 1em !important;
        background: ${theme.cursor} !important;
        vertical-align: text-bottom !important;
        animation: pcli-blink 1s step-end infinite !important;
        margin-left: 2px !important;
        opacity: 1 !important;
      }
      @keyframes pcli-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      ${sel} .pcli-separator {
        color: ${theme.prompt} !important;
        opacity: 0.5 !important;
        margin: 8px 0 !important;
        letter-spacing: 2px !important;
      }
      ${sel} a.pcli-link-focused {
        outline: none !important;
        background: ${theme.prompt} !important;
        color: ${theme.bg} !important;
        padding: 0 4px !important;
      }
      ${sel} a.pcli-link-focused::before {
        content: '> ';
        color: ${theme.bg} !important;
      }
      /* toggle ボタンはCLIモード内でテーマカラーに */
      .pcli-toggle-btn.pcli-active {
        color: ${theme.prompt} !important;
        border-color: ${theme.prompt} !important;
      }
    `;
    document.head.appendChild(_styleEl);
  }

  // ─── Queue & rendering ────────────────────────────────────────

  function buildQueue() {
    const temp = document.createElement('div');
    temp.innerHTML = _originalHTML;
    _queue = Array.from(temp.children);
  }

  function runQueue() {
    _isAnimating = true;
    let index = 0;

    function next() {
      if (_skipAnimation) {
        for (let i = index; i < _queue.length; i++) {
          appendElement(_queue[i].cloneNode(true));
        }
        finalize();
        return;
      }
      if (index >= _queue.length) { finalize(); return; }
      renderElement(_queue[index++], next);
    }
    next();
  }

  function finalize() {
    _isAnimating = false;
    addCursor();
    bindKeyboardNavigation();
  }

  function appendElement(el) {
    const isCommand = COMMAND_TAGS.includes(el.tagName);
    const wrapper = document.createElement('div');
    wrapper.className = isCommand ? 'pcli-line pcli-command' : 'pcli-line pcli-output';
    wrapper.appendChild(el);
    _container.appendChild(wrapper);
    scrollToBottom();
  }

  function renderElement(el, callback) {
    const tag = el.tagName;

    if (tag === 'H1' && _options.logo && !_logoRendered) {
      _logoRendered = true;
      renderLogo(el, callback);
      return;
    }
    if (tag === 'IMG')   { renderImage(el, callback); return; }
    if (tag === 'TABLE') { renderTable(el, callback); return; }
    if (tag === 'VIDEO') { renderVideo(el, callback); return; }

    const isCommand = COMMAND_TAGS.includes(tag);
    const wrapper = document.createElement('div');
    wrapper.className = isCommand ? 'pcli-line pcli-command' : 'pcli-line pcli-output';
    const clone = el.cloneNode(true);
    wrapper.appendChild(clone);
    _container.appendChild(wrapper);
    scrollToBottom();

    if (tag === 'PRE') { setTimeout(callback, 80); return; }
    typeTextNodes(clone, callback);
  }

  // ─── Typing animation ─────────────────────────────────────────

  function typeTextNodes(el, callback) {
    const speed = 28;
    const textNodes = getTextNodes(el);
    if (textNodes.length === 0) { setTimeout(callback, 50); return; }

    const originals = textNodes.map(node => {
      const text = node.textContent;
      node.textContent = '';
      return { node, text };
    });

    let nodeIdx = 0, charIdx = 0;

    function tick() {
      if (_skipAnimation) {
        originals.forEach(({ node, text }) => (node.textContent = text));
        scrollToBottom();
        callback();
        return;
      }
      if (nodeIdx >= originals.length) { scrollToBottom(); callback(); return; }
      const { node, text } = originals[nodeIdx];
      if (charIdx < text.length) {
        node.textContent += text[charIdx++];
        scrollToBottom();
        setTimeout(tick, speed);
      } else {
        nodeIdx++; charIdx = 0;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  function getTextNodes(el) {
    const nodes = [];
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) nodes.push(node);
      } else { node.childNodes.forEach(walk); }
    }
    walk(el);
    return nodes;
  }

  // ─── Video ────────────────────────────────────────────────────

  function renderVideo(videoEl, callback) {
    const outer = document.createElement('div');
    outer.className = 'pcli-line pcli-output';

    const label = document.createElement('div');
    label.className = 'pcli-video-label';
    label.textContent = '▶ video';

    const wrapper = document.createElement('div');
    wrapper.className = 'pcli-video-wrapper';

    const clone = videoEl.cloneNode(true);
    clone.className = 'pcli-video';

    wrapper.appendChild(clone);
    outer.appendChild(label);
    outer.appendChild(wrapper);
    _container.appendChild(outer);
    scrollToBottom();
    setTimeout(callback, 200);
  }

  // ─── Table ────────────────────────────────────────────────────

  function renderTable(tableEl, callback) {
    const ascii = tableToAscii(tableEl);
    const wrapper = document.createElement('div');
    wrapper.className = 'pcli-line pcli-output';
    const pre = document.createElement('pre');
    pre.textContent = ascii;
    wrapper.appendChild(pre);
    _container.appendChild(wrapper);
    scrollToBottom();
    setTimeout(callback, 80);
  }

  function tableToAscii(tableEl) {
    // 行データ収集
    const rows = [];
    let headerRows = 0;
    tableEl.querySelectorAll('thead tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim());
      if (cells.length) { rows.push(cells); headerRows++; }
    });
    tableEl.querySelectorAll('tbody tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim());
      if (cells.length) rows.push(cells);
    });
    if (!rows.length) return '';

    // 列幅計算（日本語などの全角文字は幅2として扱う）
    const colCount = Math.max(...rows.map(r => r.length));
    const colWidths = Array(colCount).fill(0);
    rows.forEach(row => {
      row.forEach((cell, i) => {
        colWidths[i] = Math.max(colWidths[i] || 0, displayWidth(cell));
      });
    });

    const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';

    const lines = [separator];
    rows.forEach((row, rowIdx) => {
      const line = '| ' + row.map((cell, i) =>
        padWidth(cell, colWidths[i])
      ).join(' | ') + ' |';
      lines.push(line);
      // ヘッダー行の後に区切り線
      if (rowIdx === headerRows - 1) lines.push(separator);
    });
    lines.push(separator);
    return lines.join('\n');
  }

  function displayWidth(str) {
    let w = 0;
    for (const ch of str) {
      w += isFullWidth(ch) ? 2 : 1;
    }
    return w;
  }

  function isFullWidth(ch) {
    const code = ch.codePointAt(0);
    return (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3041 && code <= 0x33FF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6)
    );
  }

  function padWidth(str, width) {
    const spaces = width - displayWidth(str);
    return str + ' '.repeat(Math.max(0, spaces));
  }

  // ─── Image ────────────────────────────────────────────────────

  function renderImage(imgEl, callback) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pcli-line pcli-output';

    if (_options.image === 'normal') {
      const img = imgEl.cloneNode(true);
      img.classList.add('pcli-normal');
      wrapper.appendChild(img);
      _container.appendChild(wrapper);
      scrollToBottom();
      setTimeout(callback, 200);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const pre = document.createElement('pre');
      pre.className = 'pcli-ascii-img';
      pre.textContent = imageToAscii(img);
      wrapper.appendChild(pre);
      _container.appendChild(wrapper);
      scrollToBottom();
      setTimeout(callback, 200);
    };
    img.onerror = function () {
      const fallback = imgEl.cloneNode(true);
      fallback.classList.add('pcli-normal');
      wrapper.appendChild(fallback);
      _container.appendChild(wrapper);
      scrollToBottom();
      setTimeout(callback, 200);
    };
    img.src = imgEl.src;
  }

  function imageToAscii(img) {
    const chars = '@#S%?*+;:,. ';
    const width  = _options.imageWidth || 60;
    const height = Math.floor(width * (img.naturalHeight / img.naturalWidth) * 0.45);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let result = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const b = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        result += chars[Math.floor((1 - b) * (chars.length - 1))];
      }
      result += '\n';
    }
    return result;
  }

  // ─── Logo ─────────────────────────────────────────────────────

  function renderLogo(h1El, callback) {
    const logo = _options.logo;

    if (logo.type === 'custom') {
      const pre = document.createElement('pre');
      pre.textContent = logo.text;
      _container.appendChild(pre);
      scrollToBottom();
      setTimeout(callback, 150);
      return;
    }

    if (logo.type === 'figlet') {
      if (typeof figlet !== 'undefined') {
        figlet.text(h1El.textContent.trim(), { font: logo.font || 'Standard' }, function (err, result) {
          const pre = document.createElement('pre');
          pre.textContent = err ? h1El.textContent : result;
          _container.appendChild(pre);
          scrollToBottom();
          setTimeout(callback, 150);
        });
      } else {
        console.warn('[PretendCLI] figlet is not loaded.');
        fallbackCommand(h1El, callback);
      }
      return;
    }

    fallbackCommand(h1El, callback);
  }

  function fallbackCommand(el, callback) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pcli-line pcli-command';
    const clone = el.cloneNode(true);
    wrapper.appendChild(clone);
    _container.appendChild(wrapper);
    typeTextNodes(clone, callback);
  }

  // ─── Cursor ───────────────────────────────────────────────────

  function addCursor() {
    const cursor = document.createElement('span');
    cursor.className = 'pcli-cursor';
    _container.appendChild(cursor);
    scrollToBottom();
  }

  // ─── Scroll ───────────────────────────────────────────────────

  function scrollToBottom() {
    _container.scrollTop = _container.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  }

  // ─── Interaction ──────────────────────────────────────────────

  function bindSkipOnInteraction() {
    // 古いリスナーを先に削除
    if (_skipHandler) {
      _container.removeEventListener('click', _skipHandler);
      _container.removeEventListener('keydown', _skipHandler);
    }
    _skipHandler = function () { if (_isAnimating) _skipAnimation = true; };
    _container.addEventListener('click', _skipHandler);
    _container.addEventListener('keydown', _skipHandler);
  }

  function bindNavigation() {
    // 古いリスナーを先に削除
    if (_navHandler) {
      _container.removeEventListener('click', _navHandler);
    }

    _navHandler = function (e) {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;

      // 絶対URLでも同一ドメインならインラインナビとして扱う
      if (/^https?:\/\/|^\/\//.test(href)) {
        try {
          const url = new URL(href);
          if (url.hostname !== window.location.hostname) {
            e.preventDefault();
            printLine('[opening external link...]', 'pcli-output');
            setTimeout(() => window.open(href, '_blank'), 500);
            return;
          }
          // 同一ドメインの絶対URLは相対パスに変換して続行
        } catch (e) {
          return;
        }
      }

      if (href.startsWith('#')) {
        e.preventDefault();
        let target = null;
        try { target = document.querySelector(href); } catch (e) { return; }
        if (target) {
          printLine('$ cd ' + href, 'pcli-command');
          const clone = target.cloneNode(true);
          const wrapper = document.createElement('div');
          wrapper.className = 'pcli-line pcli-output';
          wrapper.appendChild(clone);
          _container.appendChild(wrapper);
          typeTextNodes(clone, () => addCursor());
        }
        return;
      }

      e.preventDefault();
      printLine('$ fetch ' + href, 'pcli-command');
      fetch(href)
        .then(r => r.text())
        .then(html => {
          const doc  = new DOMParser().parseFromString(html, 'text/html');
          const zone = doc.querySelector(_options.target);
          if (!zone) { printLine('[error: no terminal zone found on that page]', 'pcli-output'); return; }
          history.pushState({}, '', href);
          printSeparator();
          _queue = Array.from(zone.children);
          _skipAnimation = false;
          _isAnimating = true;
          let i = 0;
          function next() {
            if (i >= _queue.length) { finalize(); return; }
            renderElement(_queue[i++], next);
          }
          next();
        })
        .catch(() => printLine('[error: could not load page]', 'pcli-output'));
    };

    _container.addEventListener('click', _navHandler);
  }

  function bindKeyboardNavigation() {
    if (_keyHandler) document.removeEventListener('keydown', _keyHandler);

    _keyHandler = function (e) {
      if (!_container || _currentMode !== 'cli') return;
      const links = Array.from(_container.querySelectorAll('a'));
      if (!links.length) return;

      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        _focusedLinkIndex = (_focusedLinkIndex + 1) % links.length;
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        _focusedLinkIndex = (_focusedLinkIndex - 1 + links.length) % links.length;
      } else if (e.key === 'Enter' && _focusedLinkIndex >= 0) {
        e.preventDefault();
        links[_focusedLinkIndex].click();
        return;
      } else { return; }

      links.forEach(l => l.classList.remove('pcli-link-focused'));
      const active = links[_focusedLinkIndex];
      if (active) { active.classList.add('pcli-link-focused'); active.scrollIntoView({ block: 'nearest' }); }
    };

    _focusedLinkIndex = -1;
    document.addEventListener('keydown', _keyHandler);
  }

  // ─── Background video ─────────────────────────────────────────

  const VIDEO_MIME = {
    mp4:  'video/mp4',
    webm: 'video/webm',
    ogg:  'video/ogg',
    ogv:  'video/ogg',
    mov:  'video/quicktime',
  };

  function addBackgroundVideo() {
    if (!_options.backgroundVideo) return;
    removeBackgroundVideo();

    const video = document.createElement('video');
    video.autoplay   = true;
    video.muted      = true;
    video.loop       = true;
    video.playsInline = true;
    video.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 100vw',
      'height: 100vh',
      'object-fit: cover',
      'z-index: -1',
      `opacity: ${_options.backgroundVideoOpacity}`,
      'pointer-events: none',
    ].join(';');

    // 文字列でも配列でも受け取れる
    const sources = Array.isArray(_options.backgroundVideo)
      ? _options.backgroundVideo
      : [_options.backgroundVideo];

    sources.forEach(function(src) {
      const ext  = src.split('.').pop().toLowerCase();
      const mime = VIDEO_MIME[ext] || '';
      const source = document.createElement('source');
      source.src  = src;
      if (mime) source.type = mime;
      video.appendChild(source);
    });

    document.body.appendChild(video);

    // オーバーレイ（動画とテキストの間に暗い層を挟む）
    if (_options.backgroundVideoOverlay > 0) {
      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100vw',
        'height: 100vh',
        'z-index: 0',
        `background: rgba(0, 0, 0, ${_options.backgroundVideoOverlay})`,
        'pointer-events: none',
      ].join(';');
      document.body.appendChild(overlay);
      _bgVideoEl = { video, overlay };
    } else {
      _bgVideoEl = { video, overlay: null };
    }
  }

  function removeBackgroundVideo() {
    if (_bgVideoEl) {
      if (_bgVideoEl.video)   _bgVideoEl.video.remove();
      if (_bgVideoEl.overlay) _bgVideoEl.overlay.remove();
      _bgVideoEl = null;
    }
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function printSeparator() {
    const div = document.createElement('div');
    div.className = 'pcli-line pcli-separator';
    div.textContent = '----------------------------------------';
    _container.appendChild(div);
    scrollToBottom();
  }

  function printLine(text, className) {
    const div = document.createElement('div');
    div.className = 'pcli-line ' + className;
    div.textContent = text;
    _container.appendChild(div);
    scrollToBottom();
  }

  // ─── Export ───────────────────────────────────────────────────

  global.PretendCLI = { init, destroy };

})(window);
