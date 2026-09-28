(function () {
  'use strict';

  var PEEKS_PER_RUN = 1;   // a second peek sends you back to the start

  /* ------------------------------------------------------------------ */
  /* storage                                                             */
  /* ------------------------------------------------------------------ */

  var KEY = 'memorise.v1';
  var data = { decks: [], settings: { fuzzy: true } };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.decks)) data.decks = parsed.decks;
        if (parsed && parsed.settings && 'fuzzy' in parsed.settings) {
          data.settings.fuzzy = !!parsed.settings.fuzzy;
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
      toast('Could not save to this browser: ' + e.message, true);
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

  // small status message; alert() is blocked in some embedded viewers
  var toastTimer = null;
  function toast(msg, isError) {
    var box = $('#toast');
    box.textContent = msg;
    box.className = isError ? 'error' : '';
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 3500);
  }

  // click once to arm, click again to confirm; confirm() is blocked in some viewers
  function armDelete(btn, onConfirm) {
    if (btn.dataset.armed === '1') { onConfirm(); return; }
    var label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = 'Sure?';
    btn.classList.add('armed');
    setTimeout(function () {
      if (!btn.isConnected) return;
      btn.dataset.armed = '';
      btn.textContent = label;
      btn.classList.remove('armed');
    }, 4000);
  }

  // some environments report the return key as "Return" rather than "Enter"
  function isEnter(e) {
    return e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13;
  }

  function show(view) {
    $('#view-decks').hidden = view !== 'decks';
    $('#view-deck').hidden = view !== 'deck';
    $('#view-type').hidden = view !== 'type';
    window.scrollTo(0, 0);
  }

  function wordCount(text) {
    var t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  /* ------------------------------------------------------------------ */
  /* deck list                                                           */
  /* ------------------------------------------------------------------ */

  var currentDeckId = null;
  var editingCardId = null;
  var renamingDeckId = null;

  function deckWords(deck) {
    return deck.cards.reduce(function (n, c) { return n + wordCount(c.text); }, 0);
  }

  function renderDecks() {
    var list = $('#deck-list');
    list.innerHTML = '';
    $('#decks-empty').hidden = data.decks.length > 0;

    data.decks.forEach(function (deck) {
      var li = el('li');

      if (renamingDeckId === deck.id) {
        var field = el('input');
        field.type = 'text';
        field.value = deck.name;

        var ok = el('button', 'btn primary small', 'Save');
        var cancel = el('button', 'btn ghost small', 'Cancel');

        var commit = function () {
          var n = field.value.trim();
          if (!n) { field.focus(); return; }
          deck.name = n;
          renamingDeckId = null;
          save();
          renderDecks();
        };
        ok.onclick = commit;
        cancel.onclick = function () { renamingDeckId = null; renderDecks(); };
        field.onkeydown = function (e) {
          if (isEnter(e)) { e.preventDefault(); commit(); }
          if (e.key === 'Escape' || e.key === 'Esc') { renamingDeckId = null; renderDecks(); }
        };

        li.append(field, ok, cancel);
        list.appendChild(li);
        field.focus();
        field.select();
        return;
      }

      var name = el('span', 'name', deck.name);
      var meta = el('span', 'meta',
        plural(deck.cards.length, 'card', 'cards') + ' · ' + plural(deckWords(deck), 'word', 'words'));

      var open = el('button', 'btn small', 'Open');
      open.onclick = function () { openDeck(deck.id); };

      var rename = el('button', 'btn ghost small', 'Rename');
      rename.onclick = function () { renamingDeckId = deck.id; renderDecks(); };

      var del = el('button', 'btn ghost small danger', 'Delete');
      del.onclick = function () {
        armDelete(del, function () {
          data.decks = data.decks.filter(function (d) { return d.id !== deck.id; });
          save();
          renderDecks();
          toast('Deleted deck "' + deck.name + '"');
        });
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
    renamingDeckId = null;
    resetCardForm();
    renderDeck();
    show('deck');
  }

  function renderDeck() {
    var deck = deckById(currentDeckId);
    if (!deck) { show('decks'); return; }

    $('#deck-title').textContent = deck.name;
    $('#deck-sub').textContent = deck.cards.length
      ? plural(deck.cards.length, 'card', 'cards') + ' · ' + plural(deckWords(deck), 'word', 'words')
      : 'Empty deck';
    $('#btn-type-all').hidden = deck.cards.length === 0;
    $('#cards-empty').hidden = deck.cards.length > 0;

    var list = $('#card-list');
    list.innerHTML = '';

    deck.cards.forEach(function (card, index) {
      var li = el('li');

      var name = el('span', 'name', (index + 1) + '. ' + card.title);
      var preview = el('span', 'preview', card.text.replace(/\s+/g, ' ').slice(0, 90));
      name.appendChild(preview);

      var meta = el('span', 'meta', plural(wordCount(card.text), 'word', 'words'));

      var start = el('button', 'btn small', 'Start');
      start.onclick = function () { startCard(deck, index); };

      var edit = el('button', 'btn ghost small', 'Edit');
      edit.onclick = function () { editCard(card); };

      var up = el('button', 'btn ghost small', '↑');
      up.title = 'Move up';
      up.disabled = index === 0;
      up.onclick = function () { moveCard(index, -1); };

      var down = el('button', 'btn ghost small', '↓');
      down.title = 'Move down';
      down.disabled = index === deck.cards.length - 1;
      down.onclick = function () { moveCard(index, 1); };

      var del = el('button', 'btn ghost small danger', 'Delete');
      del.onclick = function () {
        armDelete(del, function () {
          deck.cards.splice(index, 1);
          if (editingCardId === card.id) resetCardForm();
          save();
          renderDeck();
          toast('Deleted card "' + card.title + '"');
        });
      };

      li.append(name, meta, start, edit, up, down, del);
      list.appendChild(li);
    });
  }

  function moveCard(index, dir) {
    var deck = deckById(currentDeckId);
    var target = index + dir;
    if (target < 0 || target >= deck.cards.length) return;
    deck.cards.splice(target, 0, deck.cards.splice(index, 1)[0]);
    save();
    renderDeck();
  }

  function editCard(card) {
    editingCardId = card.id;
    $('#card-title').value = card.title;
    $('#card-text').value = card.text;
    $('#editor-heading').textContent = 'Edit card';
    $('#card-submit').textContent = 'Save card';
    $('#card-cancel').hidden = false;
    $('#card-title').focus();
    $('#card-title').scrollIntoView({ block: 'center' });
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
      toast('Saved "' + title + '"');
    } else {
      deck.cards.push({ id: uid(), title: title, text: text });
      toast('Added "' + title + '"');
    }
    resetCardForm();
    save();
    renderDeck();
  });

  $('#card-cancel').onclick = resetCardForm;
  $('#back-to-decks').onclick = function () { renamingDeckId = null; renderDecks(); show('decks'); };
  $('#home-link').onclick = function () { renamingDeckId = null; renderDecks(); show('decks'); };

  $('#btn-type-all').onclick = function () {
    var deck = deckById(currentDeckId);
    if (deck && deck.cards.length) startWholeEssay(deck);
  };

  /* ------------------------------------------------------------------ */
  /* typing engine                                                       */
  /* ------------------------------------------------------------------ */

  var T = {
    tokens: [],    // { display: "witches'," , core: "witches" }
    state: [],     // 'pending' | 'current' | 'done' | 'fixed'
    els: [],
    i: 0,          // index of the word being typed
    buf: '',       // letters typed so far for that word
    exact: 0,
    fixed: 0,
    wrong: 0,
    total: 0,      // words that actually have to be typed
    open: {},      // words uncovered right now, cleared on restart
    marked: {},    // words you have peeked at, kept until you change card
    started: false,
    studying: false,
    locked: false, // briefly frozen while a forced restart plays out
    peeksLeft: PEEKS_PER_RUN,
    peeksUsed: 0,
    start: null,
    timer: null,
    running: false,
    deckId: null,
    cardIndex: null
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

  // how wrong a word may be before it stops counting as a near-miss
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
    if (slack(target) === 0) return target.length >= 3 && isSwap(typed, target);
    if (Math.abs(typed.length - target.length) > slack(target)) return false;
    return distance(typed, target) <= slack(target);
  }

  /* ---- starting a run ---- */

  function startCard(deck, index) {
    var card = deck.cards[index];
    beginRun(
      deck.name + ' · ' + card.title,
      'Card ' + (index + 1) + ' of ' + deck.cards.length + ' · ' + plural(wordCount(card.text), 'word', 'words'),
      card.text, deck.id, index
    );
  }

  function startWholeEssay(deck) {
    beginRun(
      deck.name,
      'Whole essay · ' + plural(deck.cards.length, 'card', 'cards') + ' · ' + plural(deckWords(deck), 'word', 'words'),
      deck.cards.map(function (c) { return c.text; }).join(' '), deck.id, null
    );
  }

  function beginRun(title, sub, rawText, deckId, cardIndex) {
    T.deckId = deckId;
    T.cardIndex = cardIndex;
    T.marked = {};                 // a new card starts with a clean slate
    T.tokens = tokenize(rawText);
    T.total = T.tokens.filter(function (t) { return t.core.length > 0; }).length;
    $('#type-title').textContent = title;
    $('#type-sub').textContent = sub;
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
      span.dataset.i = i;
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
    T.open = {};                   // peek marks survive, uncovered words do not
    T.started = false;
    T.studying = false;
    T.locked = false;
    T.peeksLeft = PEEKS_PER_RUN;
    T.peeksUsed = 0;
    T.start = null;
    T.running = true;
    stopTimer();

    skipUntypable();
    if (T.i < T.tokens.length) T.state[T.i] = 'current';
    T.tokens.forEach(function (_, i) { renderWord(i); });

    $('#results').hidden = true;
    $('#text').classList.add('hide');
    $('#opt-fuzzy').checked = data.settings.fuzzy;
    updateToolbar();
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
    var hidden = T.open[i] ? 'ch show' : 'ch blank';
    host.className = 'word ' + state + (T.marked[i] ? ' peeked' : '');
    host.innerHTML = '';

    if (state === 'done' || state === 'fixed') {
      appendChars(host, tok.display, 'ch ok');
      return;
    }
    if (state === 'pending') {
      appendChars(host, tok.display, hidden);
      return;
    }

    // the word being typed: what you have typed, then blanks for the rest
    Array.from(T.buf).forEach(function (ch, j) {
      var good = j < tok.core.length && ch === tok.core[j];
      host.appendChild(el('span', 'ch ' + (good ? 'ok' : 'bad'), ch));
    });

    var rest = tok.core.slice(T.buf.length);
    if (rest.length) {
      Array.from(rest).forEach(function (ch, k) {
        host.appendChild(el('span', hidden + (k === 0 ? ' current' : ''), ch));
      });
    } else {
      host.appendChild(el('span', 'caret'));
    }
  }

  /* ---- typing ---- */

  function typeChar(ch) {
    if (T.locked || !T.running || T.i >= T.tokens.length) return;

    if (/\s/.test(ch)) { submitWord(); return; }

    var lower = ch.toLowerCase();
    if (!/[a-z0-9]/.test(lower)) return; // punctuation is never required, and never wrong

    if (!T.started) {
      T.started = true;
      if (T.studying) setStudy(false);
      updateToolbar();
    }
    if (!T.start) { T.start = Date.now(); startTimer(); }

    var tok = T.tokens[T.i];
    if (T.buf.length >= tok.core.length + 8) return;

    T.buf += lower;
    renderWord(T.i);

    // full length reached: take it if it is right, or close enough
    if (T.buf.length >= tok.core.length) {
      if (T.buf === tok.core) accept('done');
      else if (isNearMiss(T.buf, tok.core)) accept('fixed');
    }
    updateStats();
  }

  function submitWord() {
    if (T.locked || !T.running || !T.buf.length) return;
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
      keepInView(T.i);
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
    if (T.locked || !T.running) return;
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
    for (var k = j; k <= T.i && k < T.tokens.length; k++) {
      T.state[k] = 'pending';
      renderWord(k);
    }
    T.i = j;
    T.state[T.i] = 'current';
    renderWord(T.i);
    updateStats();
  }

  function keepInView(i) {
    var host = T.els[i];
    if (!host) return;
    var box = host.getBoundingClientRect();
    if (box.bottom > window.innerHeight - 40 || box.top < 60) {
      host.scrollIntoView({ block: 'center' });
    }
  }

  /* ---- studying and peeking ---- */

  function setStudy(on) {
    T.studying = !!on && !T.started;
    $('#text').classList.toggle('hide', !T.studying);
    updateToolbar();
  }

  // peek at one word: it stays highlighted so you can see what needs work
  function peekWord(i) {
    if (T.locked || !T.running) return;
    var tok = T.tokens[i];
    if (!tok || !tok.core) return;

    // already on the page: marking it for attention is free
    if (T.state[i] === 'done' || T.state[i] === 'fixed') {
      if (T.marked[i]) delete T.marked[i]; else T.marked[i] = true;
      renderWord(i);
      return;
    }

    // covering a word back up is free too
    if (T.open[i]) {
      delete T.open[i];
      renderWord(i);
      return;
    }

    T.open[i] = true;
    T.marked[i] = true;
    T.peeksUsed++;
    renderWord(i);

    if (T.peeksLeft > 0) {
      T.peeksLeft--;
      updateToolbar();
      updateStats();
      toast('Peek used. A second one starts the card again.');
      return;
    }
    forcedRestart();
  }

  function forcedRestart() {
    T.locked = true;
    T.running = false;
    stopTimer();
    updateToolbar();
    toast('Second peek — read it, then start again from the beginning.');
    setTimeout(function () {
      reset();
      focusCapture();
    }, 2200);
  }

  function markedCount() {
    return Object.keys(T.marked).length;
  }

  /* ---- finishing ---- */

  function finish() {
    T.running = false;
    stopTimer();

    var seconds = T.start ? (Date.now() - T.start) / 1000 : 0;
    var clean = T.peeksUsed === 0 && T.wrong === 0;
    var perfect = clean && T.fixed === 0;

    $('#results-verdict').textContent = perfect
      ? 'Perfect recall.'
      : clean ? 'Clean run — no peeks, no rejects.' : 'Done. Run it again for a clean one.';
    $('#results').classList.toggle('plain', !clean);

    $('#results-text').textContent = [
      wpm() + ' wpm',
      accuracy() + '% first time',
      plural(T.fixed, 'autocorrect', 'autocorrects'),
      plural(T.wrong, 'reject', 'rejects'),
      plural(T.peeksUsed, 'peek', 'peeks'),
      fmtTime(seconds)
    ].join('  ·  ');

    var deck = deckById(T.deckId);
    var hasNext = deck && T.cardIndex != null && T.cardIndex + 1 < deck.cards.length;
    $('#btn-next').hidden = !hasNext;

    $('#results').hidden = false;
    updateToolbar();
    if (markedCount()) {
      toast(plural(markedCount(), 'word', 'words') + ' highlighted to work on.');
    }
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
    $('#stat-progress').textContent = done + ' / ' + T.total;
    $('#stat-wpm').textContent = wpm();
    $('#stat-acc').textContent = accuracy() + '%';
    $('#stat-peeks').textContent = T.peeksLeft;
    $('#chip-peeks').classList.toggle('spent', T.peeksLeft === 0);
    $('#chip-peeks').lastChild.textContent = T.peeksLeft === 1 ? ' peek left' : ' peeks left';
    $('#stat-time').textContent = fmtTime(T.start ? (Date.now() - T.start) / 1000 : 0);
    $('#bar-fill').style.width = (T.total ? (done / T.total) * 100 : 0) + '%';
  }

  function updateToolbar() {
    var study = $('#btn-study');
    study.textContent = T.studying ? 'Hide text' : 'Study text';
    study.disabled = T.started || !T.running;
    study.title = T.started
      ? 'Locked once you start typing. Restart if you need to study again.'
      : 'Read the whole text before you start';

    var peek = $('#btn-peek');
    peek.disabled = !T.running;
    peek.textContent = T.peeksLeft > 0 ? 'Peek word' : 'Peek word (restarts)';
    peek.classList.toggle('warn', T.peeksLeft === 0);
    peek.title = T.peeksLeft > 0
      ? 'Uncover the word you are on. You get one per run.'
      : 'Your peek is spent. Another one starts the card again.';
  }

  function startTimer() {
    stopTimer();
    T.timer = setInterval(updateStats, 250);
  }
  function stopTimer() {
    if (T.timer) { clearInterval(T.timer); T.timer = null; }
  }

  /* ---- input ---- */

  var capture = $('#capture');

  function focusCapture() {
    capture.value = '';
    capture.focus({ preventScroll: true });
  }

  function restartCard() {
    reset();
    focusCapture();
    toast('Restarted from the beginning');
  }

  function nextCard() {
    var deck = deckById(T.deckId);
    if (deck && T.cardIndex != null && T.cardIndex + 1 < deck.cards.length) {
      startCard(deck, T.cardIndex + 1);
    }
  }

  // keys are read from the whole document, so typing works even if the
  // hidden input has quietly lost focus
  document.addEventListener('keydown', function (e) {
    if ($('#view-type').hidden) return;

    // restart: Esc, or Cmd/Ctrl+R in place of the browser's reload
    if (e.key === 'Escape' || e.key === 'Esc' ||
        ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R'))) {
      e.preventDefault();
      restartCard();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    var t = e.target;
    if (t !== capture && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

    // on the results panel, Enter moves on
    if (!T.running && !$('#results').hidden && isEnter(e)) {
      e.preventDefault();
      if ($('#btn-next').hidden) restartCard(); else nextCard();
      return;
    }

    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (isEnter(e) || e.key === 'Tab') { e.preventDefault(); submitWord(); return; }
    if (e.key && e.key.length === 1) { e.preventDefault(); typeChar(e.key); }
  });

  // fallback for mobile keyboards, which do not report real keys
  capture.addEventListener('input', function () {
    var v = capture.value;
    capture.value = '';
    Array.from(v).forEach(typeChar);
  });

  // clicking a word peeks at it; clicking elsewhere just restores focus
  document.addEventListener('mousedown', function (e) {
    if ($('#view-type').hidden) return;
    if (e.target.closest('button, input, label, a, summary')) return;
    e.preventDefault();
    var word = e.target.closest('.word');
    if (word && word.dataset.i != null) peekWord(Number(word.dataset.i));
    focusCapture();
  });

  /* ---- typing view controls ---- */

  $('#opt-fuzzy').onchange = function () {
    data.settings.fuzzy = this.checked;
    save();
    focusCapture();
  };

  $('#btn-study').onclick = function () {
    if (T.started) {
      toast('No full reveals once you have started. Restart if you need to study again.');
      return;
    }
    setStudy(!T.studying);
    focusCapture();
  };

  $('#btn-peek').onclick = function () {
    if (T.i < T.tokens.length) peekWord(T.i);
    focusCapture();
  };

  $('#btn-restart').onclick = restartCard;
  $('#btn-again').onclick = restartCard;
  $('#btn-next').onclick = nextCard;

  $('#back-to-deck').onclick = function () {
    T.running = false;
    T.locked = false;
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
    toast('Backup downloaded');
  };

  $('#file-import').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.decks)) throw new Error('Not a Memorise backup file');
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
        toast('Added ' + plural(parsed.decks.length, 'deck', 'decks') + ' from the backup');
      } catch (err) {
        toast('Could not import that file: ' + err.message, true);
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
