(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* storage                                                             */
  /* ------------------------------------------------------------------ */

  var KEY = 'memorise.v1';
  var data = { decks: [], settings: { hide: true, fuzzy: true } };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.decks)) data.decks = parsed.decks;
        if (parsed && parsed.settings) {
          if ('hide' in parsed.settings) data.settings.hide = !!parsed.settings.hide;
          if ('fuzzy' in parsed.settings) data.settings.fuzzy = !!parsed.settings.fuzzy;
        }
      }
    } catch (e) {
      console.warn('Could not read saved decks:', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      alert('Could not save to this browser: ' + e.message);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function deckById(id) {
    for (var i = 0; i < data.decks.length; i++) if (data.decks[i].id === id) return data.decks[i];
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  var $ = function (s) { return document.querySelector(s); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function show(view) {
    $('#view-decks').hidden = view !== 'decks';
    $('#view-deck').hidden = view !== 'deck';
    $('#view-type').hidden = view !== 'type';
  }

  /* ------------------------------------------------------------------ */
  /* deck list                                                           */
  /* ------------------------------------------------------------------ */

  var currentDeckId = null;
  var editingCardId = null;

  function renderDecks() {
    var list = $('#deck-list');
    list.innerHTML = '';
    $('#decks-empty').hidden = data.decks.length > 0;

    data.decks.forEach(function (deck) {
      var li = el('li');
      var name = el('span', 'name', deck.name);
      var meta = el('span', 'meta', deck.cards.length + (deck.cards.length === 1 ? ' card' : ' cards'));

      var open = el('button', 'small', 'Open');
      open.onclick = function () { openDeck(deck.id); };

      var rename = el('button', 'small ghost', 'Rename');
      rename.onclick = function () {
        var n = prompt('Deck name:', deck.name);
        if (n && n.trim()) { deck.name = n.trim(); save(); renderDecks(); }
      };

      var del = el('button', 'small ghost danger', 'Delete');
      del.onclick = function () {
        if (confirm('Delete deck "' + deck.name + '" and all its cards?')) {
          data.decks = data.decks.filter(function (d) { return d.id !== deck.id; });
          save(); renderDecks();
        }
      };

      li.append(name, meta, open, rename, del);
      list.appendChild(li);
    });
  }

  $('#form-deck').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#deck-name');
    var name = input.value.trim();
    if (!name) return;
    data.decks.push({ id: uid(), name: name, cards: [] });
    input.value = '';
    save();
    renderDecks();
  });

  /* ------------------------------------------------------------------ */
  /* one deck                                                            */
  /* ------------------------------------------------------------------ */

  function openDeck(id) {
    currentDeckId = id;
    resetCardForm();
    renderDeck();
    show('deck');
  }

  function renderDeck() {
    var deck = deckById(currentDeckId);
    if (!deck) { show('decks'); return; }

    $('#deck-title').textContent = deck.name;
    $('#btn-type-all').hidden = deck.cards.length === 0;
    $('#cards-empty').hidden = deck.cards.length > 0;

    var list = $('#card-list');
    list.innerHTML = '';

    deck.cards.forEach(function (card, index) {
      var li = el('li');
      var name = el('span', 'name', (index + 1) + '. ' + card.title);
      var meta = el('span', 'meta', wordCount(card.text) + ' words');

      var start = el('button', 'small', 'Start');
      start.onclick = function () { startTyping(deck.name + ' - ' + card.title, card.text); };

      var edit = el('button', 'small ghost', 'Edit');
      edit.onclick = function () { editCard(card); };

      var up = el('button', 'small ghost', '↑');
      up.onclick = function () { moveCard(index, -1); };

      var down = el('button', 'small ghost', '↓');
      down.onclick = function () { moveCard(index, 1); };

      var del = el('button', 'small ghost danger', 'Delete');
      del.onclick = function () {
        if (confirm('Delete card "' + card.title + '"?')) {
          deck.cards.splice(index, 1);
          if (editingCardId === card.id) resetCardForm();
          save(); renderDeck();
        }
      };

      li.append(name, meta, start, edit, up, down, del);
      list.appendChild(li);
    });
  }

  function moveCard(index, dir) {
    var deck = deckById(currentDeckId);
    var target = index + dir;
    if (target < 0 || target >= deck.cards.length) return;
    var moved = deck.cards.splice(index, 1)[0];
    deck.cards.splice(target, 0, moved);
    save();
    renderDeck();
  }

  function wordCount(text) {
    var t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function editCard(card) {
    editingCardId = card.id;
    $('#card-title').value = card.title;
    $('#card-text').value = card.text;
    $('#editor-heading').textContent = 'Edit card';
    $('#card-submit').textContent = 'Save card';
    $('#card-cancel').hidden = false;
    $('#card-title').focus();
  }

  function resetCardForm() {
    editingCardId = null;
    $('#card-title').value = '';
    $('#card-text').value = '';
    $('#editor-heading').textContent = 'Add a card';
    $('#card-submit').textContent = 'Add card';
    $('#card-cancel').hidden = true;
  }

  $('#form-card').addEventListener('submit', function (e) {
    e.preventDefault();
    var deck = deckById(currentDeckId);
    if (!deck) return;
    var title = $('#card-title').value.trim();
    var text = $('#card-text').value.trim();
    if (!title || !text) return;

    if (editingCardId) {
      var card = deck.cards.filter(function (c) { return c.id === editingCardId; })[0];
      if (card) { card.title = title; card.text = text; }
    } else {
      deck.cards.push({ id: uid(), title: title, text: text });
    }
    resetCardForm();
    save();
    renderDeck();
  });

  $('#card-cancel').onclick = resetCardForm;
  $('#back-to-decks').onclick = function () { renderDecks(); show('decks'); };
  $('#home-link').onclick = function () { renderDecks(); show('decks'); };

  $('#btn-type-all').onclick = function () {
    var deck = deckById(currentDeckId);
    if (!deck || !deck.cards.length) return;
    var text = deck.cards.map(function (c) { return c.text; }).join(' ');
    startTyping(deck.name + ' - whole essay', text);
  };

  /* ------------------------------------------------------------------ */
  /* typing engine (word by word, forgiving)                             */
  /* ------------------------------------------------------------------ */

  var T = {
    tokens: [],   // { display: "witches'," , core: "witches" }
    state: [],    // 'pending' | 'current' | 'done' | 'fixed'
    els: [],
    i: 0,         // index of the word being typed
    buf: '',      // letters typed so far for that word
    exact: 0,
    fixed: 0,
    wrong: 0,
    start: null,
    timer: null,
    running: false,
    total: 0      // number of words that actually have to be typed
  };

  function normalize(s) {
    return s
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // what actually has to be typed: letters and digits only, lower case
  function coreOf(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function tokenize(text) {
    return normalize(text).split(' ').filter(Boolean).map(function (w) {
      return { display: w, core: coreOf(w) };
    });
  }

  /* ---- fuzzy matching: Damerau-Levenshtein distance ---- */

  function distance(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev2 = [], prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1); // swapped letters count as one slip
        }
        cur[j] = v;
      }
      prev2 = prev; prev = cur;
    }
    return prev[n];
  }

  // how wrong a word is allowed to be before it stops counting as a near-miss
  function slack(word) {
    if (word.length <= 3) return 0;   // short words must be right
    if (word.length <= 7) return 1;
    return 2;
  }

  // two neighbouring letters typed the wrong way round ("teh" for "the")
  function isSwap(a, b) {
    if (a.length !== b.length) return false;
    var diff = [];
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
    return diff.length === 2 && diff[1] === diff[0] + 1 &&
           a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  }

  function isNearMiss(typed, target) {
    if (!data.settings.fuzzy) return false;
    // short words are strict, except for a straight swap of two letters
    if (slack(target) === 0) return target.length >= 3 && isSwap(typed, target);
    if (Math.abs(typed.length - target.length) > slack(target)) return false;
    return distance(typed, target) <= slack(target);
  }

  /* ---- start / reset ---- */

  function startTyping(title, rawText) {
    T.tokens = tokenize(rawText);
    T.total = T.tokens.filter(function (t) { return t.core.length > 0; }).length;
    $('#type-title').textContent = title;
    buildText();
    reset();
    show('type');
    focusCapture();
  }

  function buildText() {
    var wrap = $('#text');
    wrap.innerHTML = '';
    T.els = T.tokens.map(function (tok, i) {
      var span = el('span', 'word');
      wrap.appendChild(span);
      if (i < T.tokens.length - 1) wrap.appendChild(document.createTextNode(' '));
      return span;
    });
  }

  function reset() {
    T.state = T.tokens.map(function () { return 'pending'; });
    T.i = 0;
    T.buf = '';
    T.exact = 0;
    T.fixed = 0;
    T.wrong = 0;
    T.start = null;
    T.running = true;
    stopTimer();

    skipUntypable();
    if (T.i < T.tokens.length) T.state[T.i] = 'current';
    T.tokens.forEach(function (_, i) { renderWord(i); });

    $('#results').hidden = true;
    applyOptions();
    updateStats();
  }

  // punctuation-only tokens are revealed for free
  function skipUntypable() {
    while (T.i < T.tokens.length && T.tokens[T.i].core === '') {
      T.state[T.i] = 'done';
      renderWord(T.i);
      T.i++;
    }
  }

  /* ---- drawing ---- */

  function appendChars(host, str, cls) {
    Array.from(str).forEach(function (ch) { host.appendChild(el('span', cls, ch)); });
  }

  function renderWord(i) {
    var tok = T.tokens[i], host = T.els[i], state = T.state[i];
    if (!host) return;
    host.className = 'word ' + state;
    host.innerHTML = '';

    if (state === 'done' || state === 'fixed') {
      appendChars(host, tok.display, 'ch ok');
      return;
    }
    if (state === 'pending') {
      appendChars(host, tok.display, 'ch blank');
      return;
    }

    // the word being typed: show what has been typed, then blanks for the rest
    Array.from(T.buf).forEach(function (ch, j) {
      var good = j < tok.core.length && ch === tok.core[j];
      host.appendChild(el('span', 'ch ' + (good ? 'ok' : 'bad'), ch));
    });

    var rest = tok.core.slice(T.buf.length);
    if (rest.length) {
      Array.from(rest).forEach(function (ch, k) {
        host.appendChild(el('span', 'ch blank' + (k === 0 ? ' current' : ''), ch));
      });
    } else {
      host.appendChild(el('span', 'caret'));
    }
  }

  /* ---- typing ---- */

  function typeChar(ch) {
    if (!T.running || T.i >= T.tokens.length) return;
    if (!T.start) { T.start = Date.now(); startTimer(); }

    if (/\s/.test(ch)) { submitWord(); return; }

    var lower = ch.toLowerCase();
    if (!/[a-z0-9]/.test(lower)) return; // punctuation is never required, and never wrong

    var tok = T.tokens[T.i];
    if (T.buf.length >= tok.core.length + 8) return;

    T.buf += lower;
    renderWord(T.i);

    // finished the word at the right length: accept it and move on
    if (T.buf.length >= tok.core.length) {
      if (T.buf === tok.core) accept('done');
      else if (isNearMiss(T.buf, tok.core)) accept('fixed');
    }
    updateStats();
  }

  function submitWord() {
    if (!T.buf.length) return;
    var tok = T.tokens[T.i];
    if (T.buf === tok.core) accept('done');
    else if (isNearMiss(T.buf, tok.core)) accept('fixed');
    else reject();
    updateStats();
  }

  function accept(kind) {
    T.state[T.i] = kind;
    if (kind === 'fixed') T.fixed++; else T.exact++;
    renderWord(T.i);
    T.buf = '';
    T.i++;
    skipUntypable();
    if (T.i < T.tokens.length) {
      T.state[T.i] = 'current';
      renderWord(T.i);
      scrollIntoView(T.i);
    } else {
      finish();
    }
  }

  function reject() {
    T.wrong++;
    var host = T.els[T.i];
    host.classList.add('rejected');
    setTimeout(function () { host.classList.remove('rejected'); }, 300);
    T.buf = '';
    renderWord(T.i);
  }

  function backspace() {
    if (!T.running) return;
    if (T.buf.length) {
      T.buf = T.buf.slice(0, -1);
      renderWord(T.i);
      updateStats();
      return;
    }
    // empty word: step back to the previous word that had to be typed
    var j = T.i - 1;
    while (j >= 0 && T.tokens[j].core === '') j--;
    if (j < 0) return;

    if (T.state[j] === 'fixed') T.fixed--; else T.exact--;
    if (T.i < T.tokens.length) T.state[T.i] = 'pending';
    for (var k = j; k < T.i; k++) { T.state[k] = 'pending'; renderWord(k); }
    if (T.i < T.tokens.length) renderWord(T.i);
    T.i = j;
    T.state[T.i] = 'current';
    renderWord(T.i);
    updateStats();
  }

  function scrollIntoView(i) {
    var host = T.els[i];
    if (!host) return;
    var box = host.getBoundingClientRect();
    if (box.bottom > window.innerHeight - 40 || box.top < 60) {
      host.scrollIntoView({ block: 'center' });
    }
  }

  function finish() {
    T.running = false;
    stopTimer();
    var seconds = T.start ? (Date.now() - T.start) / 1000 : 0;
    $('#results-text').textContent =
      wpm() + ' wpm  ·  ' + accuracy() + '% first-time accuracy  ·  ' +
      T.fixed + ' autocorrected  ·  ' + T.wrong + ' rejected  ·  ' + fmtTime(seconds);
    $('#results').hidden = false;
  }

  function attempts() { return T.exact + T.fixed + T.wrong; }

  function accuracy() {
    return attempts() ? Math.round(T.exact / attempts() * 100) : 100;
  }

  function wpm() {
    if (!T.start) return 0;
    var minutes = (Date.now() - T.start) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((T.exact + T.fixed) / minutes);
  }

  function fmtTime(seconds) {
    var s = Math.floor(seconds);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function updateStats() {
    var done = T.exact + T.fixed;
    $('#stat-progress').textContent = done + ' / ' + T.total + ' words';
    $('#stat-wpm').textContent = wpm() + ' wpm';
    $('#stat-acc').textContent = accuracy() + '%';
    $('#stat-time').textContent = fmtTime(T.start ? (Date.now() - T.start) / 1000 : 0);
    $('#bar-fill').style.width = (T.total ? (done / T.total) * 100 : 0) + '%';
  }

  function startTimer() {
    stopTimer();
    T.timer = setInterval(updateStats, 250);
  }
  function stopTimer() {
    if (T.timer) { clearInterval(T.timer); T.timer = null; }
  }

  /* ---- input capture ---- */

  var capture = $('#capture');

  function focusCapture() {
    capture.value = '';
    capture.focus({ preventScroll: true });
  }

  // keys are taken from the whole document, so typing works even if the
  // hidden input has quietly lost focus
  document.addEventListener('keydown', function (e) {
    if ($('#view-type').hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t !== capture && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); submitWord(); return; }
    if (e.key && e.key.length === 1) { e.preventDefault(); typeChar(e.key); }
  });

  // fallback for mobile keyboards, which do not report real keys
  capture.addEventListener('input', function () {
    var v = capture.value;
    capture.value = '';
    Array.from(v).forEach(typeChar);
  });

  // clicking anywhere in the typing view (except a control) puts focus back
  document.addEventListener('mousedown', function (e) {
    if ($('#view-type').hidden) return;
    if (e.target.closest('button, input, label, a')) return;
    e.preventDefault();
    focusCapture();
  });

  /* ---- typing view controls ---- */

  function applyOptions() {
    $('#text').classList.toggle('hide', data.settings.hide);
    $('#opt-hide').checked = data.settings.hide;
    $('#opt-fuzzy').checked = data.settings.fuzzy;
  }

  $('#opt-hide').onchange = function () {
    data.settings.hide = this.checked;
    save();
    applyOptions();
    focusCapture();
  };

  $('#opt-fuzzy').onchange = function () {
    data.settings.fuzzy = this.checked;
    save();
    focusCapture();
  };

  $('#btn-peek').onclick = function () {
    $('#text').classList.toggle('hide');
    focusCapture();
  };

  $('#btn-restart').onclick = function () { reset(); focusCapture(); };
  $('#btn-again').onclick = function () { reset(); focusCapture(); };

  $('#back-to-deck').onclick = function () {
    T.running = false;
    stopTimer();
    renderDeck();
    show('deck');
  };

  /* ------------------------------------------------------------------ */
  /* backup: export / import                                             */
  /* ------------------------------------------------------------------ */

  $('#btn-export').onclick = function () {
    var blob = new Blob([JSON.stringify({ decks: data.decks }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memorise-backup.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };

  $('#file-import').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.decks)) throw new Error('Not a Memorise backup file');
        if (!confirm('Add ' + parsed.decks.length + ' deck(s) from this file to your current decks?')) return;
        parsed.decks.forEach(function (d) {
          data.decks.push({
            id: uid(),
            name: String(d.name || 'Untitled deck'),
            cards: (d.cards || []).map(function (c) {
              return { id: uid(), title: String(c.title || 'Untitled card'), text: String(c.text || '') };
            })
          });
        });
        save();
        renderDecks();
        show('decks');
      } catch (err) {
        alert('Could not import that file: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  /* ------------------------------------------------------------------ */

  load();
  renderDecks();
  show('decks');
})();
