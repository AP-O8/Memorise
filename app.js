(function () {
  'use strict';

  var PEEKS_PER_RUN = 1;   // a second peek sends you back to the start

  /* ------------------------------------------------------------------ */
  /* storage                                                             */
  /* ------------------------------------------------------------------ */

  var KEY = 'memorise.v1';
  var MODES = {
    type:   { name: 'Type it',         hint: 'Type every word out in full.' },
    first:  { name: 'First letter',    hint: 'Type only the first letter of the next word \u2014 the rest is written for you.' },
    choice: { name: 'Multiple choice', hint: 'Pick the next word from four options: click one, or press 1-4.' },
    read:   { name: 'Read only',       hint: 'Nothing to type: only the first letter of each word is shown. Click a word to uncover it.' }
  };

  var data = { decks: [], synonyms: [], settings: { fuzzy: true, meaning: true, mode: 'type' } };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.decks)) data.decks = parsed.decks;
        if (parsed && Array.isArray(parsed.synonyms)) data.synonyms = parsed.synonyms;
        if (parsed && parsed.settings) {
          if ('fuzzy' in parsed.settings) data.settings.fuzzy = !!parsed.settings.fuzzy;
          if ('meaning' in parsed.settings) data.settings.meaning = !!parsed.settings.meaning;
          if (MODES[parsed.settings.mode]) data.settings.mode = parsed.settings.mode;
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
      if (card) {
        if (card.text !== text) { delete card.known; delete deck.knownAll; }
        card.title = title;
        card.text = text;
      }
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
    para: 0,     // accepted as the same meaning
    given: 0,    // filler words filled in because you skipped them
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
    cardIndex: null,
    mode: 'type',
    choices: [],   // the options on offer in multiple choice
    sentences: [],
    known: {},     // sentences you have ticked off as learnt
    tickEls: []
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

  var ABBREV = { mr: 1, mrs: 1, ms: 1, dr: 1, prof: 1, st: 1, eg: 1, ie: 1, etc: 1, vs: 1,
                 fig: 1, jr: 1, sr: 1, no: 1 };

  function endsSentence(tok) {
    if (!/[.!?]["')\]]*$/.test(tok.display)) return false;
    return !ABBREV[tok.core];
  }

  // group the words into sentences so each one can be ticked off
  function sentencesOf(tokens) {
    var sents = [], cur = null;
    tokens.forEach(function (tok, i) {
      if (!cur) { cur = { first: i, last: i, words: 0 }; sents.push(cur); }
      tok.sent = sents.length - 1;
      cur.last = i;
      if (tok.core) cur.words++;
      if (endsSentence(tok)) cur = null;
    });
    return sents;
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

  /* ---- meaning, not just letters ---- */

  // small function words you can drop without losing the idea
  var FILLERS = {};
  ('a an the this that these those of to in on at by for with from into as is are was were be been being ' +
   'and but or nor so yet then thus hence also just very such it its his her their our your my which who whom ' +
   'not no than when while where how what all any some more most own same too can will would could should ' +
   'has have had do does did about over under out up down off again ever even only').split(' ')
    .forEach(function (w) { FILLERS[w] = true; });

  // words that mean the same thing in essay writing; the user can add more
  var BUILTIN_SYNONYMS = [
    ['show', 'illustrate', 'demonstrate', 'convey', 'present', 'depict', 'portray', 'reveal',
     'display', 'exhibit', 'express', 'communicate', 'articulate', 'render'],
    ['suggest', 'imply', 'hint', 'insinuate', 'intimate', 'connote', 'signal', 'indicate'],
    ['emphasise', 'emphasize', 'stress', 'underline', 'underscore', 'accentuate', 'highlight',
     'foreground', 'spotlight'],
    ['explore', 'examine', 'investigate', 'interrogate', 'probe', 'analyse', 'analyze', 'consider', 'study'],
    ['criticise', 'criticize', 'condemn', 'denounce', 'attack', 'censure', 'rebuke', 'indict'],
    ['symbolise', 'symbolize', 'represent', 'embody', 'signify', 'personify', 'epitomise', 'epitomize'],
    ['reinforce', 'strengthen', 'bolster', 'cement', 'consolidate', 'entrench', 'compound'],
    ['undermine', 'weaken', 'erode', 'destabilise', 'destabilize', 'subvert', 'challenge', 'question'],
    ['create', 'produce', 'generate', 'establish', 'construct', 'form', 'build', 'forge', 'craft'],
    ['cause', 'lead', 'result', 'trigger', 'prompt', 'provoke', 'spark', 'drive', 'breed'],
    ['reflect', 'mirror', 'echo', 'parallel', 'recall'],
    ['use', 'employ', 'utilise', 'utilize', 'deploy', 'apply', 'harness', 'wield'],
    ['hide', 'conceal', 'mask', 'obscure', 'veil', 'disguise', 'cloak'],
    ['destroy', 'ruin', 'devastate', 'annihilate', 'demolish', 'wreck', 'shatter'],
    ['fight', 'struggle', 'battle', 'combat', 'resist', 'contend', 'oppose'],
    ['change', 'transform', 'alter', 'shift', 'convert', 'reshape'],
    ['begin', 'start', 'open', 'commence', 'initiate'],
    ['end', 'conclude', 'finish', 'close', 'culminate', 'terminate'],
    ['help', 'aid', 'assist', 'support', 'facilitate'],
    ['allow', 'enable', 'permit', 'let'],
    ['believe', 'think', 'feel', 'consider', 'hold', 'maintain', 'contend'],
    ['want', 'desire', 'wish', 'crave', 'long', 'yearn'],
    ['important', 'significant', 'crucial', 'vital', 'key', 'central', 'essential', 'pivotal',
     'fundamental', 'critical'],
    ['idea', 'concept', 'notion', 'theme', 'point', 'argument'],
    ['power', 'authority', 'control', 'dominance', 'domination', 'supremacy'],
    ['fear', 'terror', 'dread', 'anxiety', 'panic', 'paranoia'],
    ['suffering', 'pain', 'anguish', 'torment', 'misery', 'agony'],
    ['corrupt', 'immoral', 'depraved', 'debased', 'degenerate'],
    ['moral', 'ethical', 'righteous', 'virtuous', 'upright'],
    ['society', 'community', 'world', 'culture', 'civilisation', 'civilization'],
    ['audience', 'reader', 'viewer', 'spectator', 'onlooker'],
    ['character', 'figure', 'persona', 'protagonist'],
    ['writer', 'author', 'playwright', 'poet', 'novelist'],
    ['big', 'large', 'great', 'vast', 'immense', 'enormous', 'huge', 'profound'],
    ['small', 'minor', 'slight', 'limited', 'minimal', 'trivial'],
    ['quickly', 'rapidly', 'swiftly', 'immediately', 'instantly', 'promptly'],
    ['clearly', 'evidently', 'plainly', 'obviously', 'manifestly', 'undeniably'],
    ['often', 'frequently', 'repeatedly', 'regularly', 'commonly', 'routinely'],
    ['however', 'but', 'yet', 'although', 'though', 'whereas', 'conversely'],
    ['therefore', 'thus', 'hence', 'consequently', 'accordingly', 'so'],
    ['furthermore', 'moreover', 'additionally', 'also', 'besides'],
    ['finally', 'ultimately', 'eventually', 'lastly'],
    ['because', 'since', 'as'],
    ['extent', 'degree', 'level', 'amount', 'measure']
  ];

  var synIndex = {};

  // every shape a word might be stored or typed in: shows / show, illustrates /
  // illustrate, revealing / reveal, hurried / hurry
  function roots(w) {
    var out = {}, bases = [];
    out[w] = true;

    if (w.length > 4 && /ies$/.test(w)) bases.push(w.slice(0, -3) + 'y');
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) bases.push(w.slice(0, -1));
    if (w.length > 4 && /es$/.test(w)) bases.push(w.slice(0, -2));
    if (w.length > 5 && /ing$/.test(w)) { bases.push(w.slice(0, -3), w.slice(0, -3) + 'e'); }
    if (w.length > 4 && /ed$/.test(w)) { bases.push(w.slice(0, -2), w.slice(0, -1)); }
    if (w.length > 4 && /ly$/.test(w)) bases.push(w.slice(0, -2));

    bases.forEach(function (b) {
      if (b.length < 3) return;
      out[b] = true;
      // "running" -> "runn" -> "run"
      if (/([bdfglmnprt])\1$/.test(b)) out[b.slice(0, -1)] = true;
      if (/i$/.test(b)) out[b.slice(0, -1) + 'y'] = true;   // "hurried" -> "hurri" -> "hurry"
    });
    return out;
  }

  function shareRoot(a, b) {
    if (a === b) return true;
    var ra = roots(a), rb = roots(b);
    for (var k in ra) if (rb[k]) return true;
    return false;
  }

  function buildSynonymIndex() {
    synIndex = {};
    var groups = BUILTIN_SYNONYMS.concat(data.synonyms || []);
    groups.forEach(function (words, gi) {
      if (!words || words.length < 2) return;
      words.forEach(function (w) {
        var c = coreOf(String(w));
        if (!c) return;
        var forms = roots(c);
        for (var form in forms) if (!(form in synIndex)) synIndex[form] = gi;
      });
    });
  }

  function groupOf(word) {
    if (word in synIndex) return synIndex[word];
    var forms = roots(word);
    for (var form in forms) if (form in synIndex) return synIndex[form];
    return undefined;
  }

  function sameMeaning(typed, target) {
    if (shareRoot(typed, target)) return true;
    var a = groupOf(typed), b = groupOf(target);
    return a !== undefined && a === b;
  }

  function meaningOn() {
    return data.settings.meaning !== false;
  }

  function nextTypable(from) {
    for (var i = from; i < T.tokens.length; i++) {
      if (T.tokens[i].core && !T.known[T.tokens[i].sent]) return i;
    }
    return -1;
  }

  // how does this typed word fit the text from here on?
  function resolve(typed) {
    var tok = T.tokens[T.i];
    if (typed === tok.core) return { kind: 'done', skipped: [] };
    if (isNearMiss(typed, tok.core)) return { kind: 'fixed', skipped: [] };
    if (meaningOn() && sameMeaning(typed, tok.core)) return { kind: 'para', skipped: [] };
    if (!meaningOn()) return null;

    // you skipped a filler word: look past up to two of them
    var skipped = [];
    var idx = T.i;
    for (var step = 0; step < 2; step++) {
      if (!FILLERS[T.tokens[idx].core]) break;
      skipped.push(idx);
      idx = nextTypable(idx + 1);
      if (idx < 0) break;
      var next = T.tokens[idx].core;
      var kind = typed === next ? 'done'
               : isNearMiss(typed, next) ? 'fixed'
               : sameMeaning(typed, next) ? 'para' : null;
      if (kind) return { kind: kind, skipped: skipped.slice(), target: idx };
    }
    return null;
  }

  /* ---- sentences you have already learnt ---- */

  function knownStore() {
    var deck = deckById(T.deckId);
    if (!deck) return null;
    return T.cardIndex == null ? deck : deck.cards[T.cardIndex];
  }

  function knownKey() {
    return T.cardIndex == null ? 'knownAll' : 'known';
  }

  function loadKnown() {
    var store = knownStore();
    var known = {};
    ((store && store[knownKey()]) || []).forEach(function (n) {
      if (n >= 0 && n < T.sentences.length) known[n] = true;
    });
    return known;
  }

  function saveKnown() {
    var store = knownStore();
    if (!store) return;
    var list = Object.keys(T.known).map(Number).sort(function (a, b) { return a - b; });
    if (list.length) store[knownKey()] = list; else delete store[knownKey()];
    save();
  }

  function toggleSentence(n, on) {
    if (on) T.known[n] = true; else delete T.known[n];
    saveKnown();
    reset();
    focusCapture();
    toast(on ? 'Sentence ' + (n + 1) + ' ticked as learnt.'
             : 'Sentence ' + (n + 1) + ' is back in the run.');
  }

  function syncTicks() {
    T.tickEls.forEach(function (label, n) {
      if (!label) return;
      var box = label.firstChild;
      box.checked = !!T.known[n];
      label.classList.toggle('on', !!T.known[n]);
    });
  }

  function updateScope() {
    var ticked = Object.keys(T.known).length;
    var first = -1;
    for (var n = 0; n < T.sentences.length; n++) if (!T.known[n]) { first = n; break; }

    $('#btn-untick').hidden = ticked === 0;
    $('#scope-note').textContent = !T.sentences.length ? ''
      : ticked === 0
        ? plural(T.sentences.length, 'sentence', 'sentences') + ' \u00B7 tick one once you know it'
        : first < 0
          ? 'Every sentence is ticked as learnt'
          : ticked + ' of ' + T.sentences.length + ' ticked \u00B7 starting at sentence ' + (first + 1);
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
    T.sentences = sentencesOf(T.tokens);
    T.known = loadKnown();
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
    T.tickEls = [];
    var lastSent = -1;

    T.els = T.tokens.map(function (tok, i) {
      if (tok.sent !== lastSent) {
        lastSent = tok.sent;
        wrap.appendChild(makeTick(tok.sent));
      }
      var span = el('span', 'word');
      span.dataset.i = i;
      wrap.appendChild(span);
      if (i < T.tokens.length - 1) wrap.appendChild(document.createTextNode(' '));
      return span;
    });
    syncTicks();
  }

  function makeTick(n) {
    var label = el('label', 'tick');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!T.known[n];
    box.onchange = function () { toggleSentence(n, box.checked); };
    label.appendChild(box);
    label.appendChild(el('span', null, String(n + 1)));
    label.title = 'Tick sentence ' + (n + 1) + ' once you know it: it is written in and stepped over';
    T.tickEls[n] = label;
    return label;
  }

  function reset() {
    T.state = T.tokens.map(function (tok) { return T.known[tok.sent] ? 'known' : 'pending'; });
    T.total = T.tokens.filter(function (t) { return t.core && !T.known[t.sent]; }).length;
    T.i = 0;
    T.buf = '';
    T.exact = 0;
    T.fixed = 0;
    T.para = 0;
    T.given = 0;
    T.wrong = 0;
    T.open = {};                   // peek marks survive, uncovered words do not
    T.started = false;
    T.studying = false;
    T.locked = false;
    T.peeksLeft = PEEKS_PER_RUN;
    T.peeksUsed = 0;
    T.start = null;
    T.running = true;
    T.mode = data.settings.mode;
    stopTimer();

    if (T.mode === 'read') {
      T.i = T.tokens.length;            // nothing is being typed
    } else {
      skipUntypable();
      if (T.i < T.tokens.length) T.state[T.i] = 'current';
    }
    T.tokens.forEach(function (_, i) { renderWord(i); });
    syncTicks();
    updateScope();

    $('#results').hidden = true;
    $('#btn-again').hidden = false;
    $('#btn-next').hidden = true;
    $('#text').classList.add('hide');
    $('#opt-fuzzy').checked = data.settings.fuzzy;
    $('#opt-meaning').checked = meaningOn();
    buildChoices();
    updateToolbar();
    updateStats();

    if (!T.total && T.mode !== 'read') {
      T.running = false;
      $('#results').classList.add('plain');
      $('#results-verdict').textContent = 'Nothing left to type';
      $('#results-text').textContent = 'Every sentence is ticked as learnt. Untick one to practise it.';
      $('#btn-again').hidden = true;
      $('#results').hidden = false;
      updateToolbar();
    }
  }

  // punctuation, and whole sentences you have ticked, are stepped over
  function skipUntypable() {
    while (T.i < T.tokens.length &&
           (T.tokens[T.i].core === '' || T.known[T.tokens[T.i].sent])) {
      T.state[T.i] = T.known[T.tokens[T.i].sent] ? 'known' : 'done';
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

    // read only: first letter and punctuation stay, the rest are blanks
    if (T.mode === 'read') {
      var shown = T.open[i] || state === 'known';
      var seenLetter = false;
      Array.from(tok.display).forEach(function (ch) {
        if (!/[a-z0-9]/i.test(ch)) { host.appendChild(el('span', 'ch ok', ch)); return; }
        if (!seenLetter) {
          seenLetter = true;
          host.appendChild(el('span', 'ch ok lead', ch));
        } else {
          host.appendChild(el('span', shown ? 'ch show' : 'ch blank', ch));
        }
      });
      return;
    }

    if (state !== 'pending' && state !== 'current') {
      if (T.mode === 'first') {
        // mark the one letter you actually supplied
        var chars = Array.from(tok.display);
        var lead = -1;
        for (var c = 0; c < chars.length; c++) {
          if (/[a-z0-9]/i.test(chars[c])) { lead = c; break; }
        }
        chars.forEach(function (ch, idx) {
          host.appendChild(el('span', 'ch ok' + (idx === lead ? ' lead' : ''), ch));
        });
      } else {
        appendChars(host, tok.display, 'ch ok');
      }
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

  function beginTyping() {
    if (!T.started) {
      T.started = true;
      if (T.studying) setStudy(false);
      updateToolbar();
    }
    if (!T.start) { T.start = Date.now(); startTimer(); }
  }

  function typeChar(ch) {
    if (T.mode === 'read') return;
    if (T.locked || !T.running || T.i >= T.tokens.length) return;

    // multiple choice: 1-4 pick an option, nothing else types
    if (T.mode === 'choice') {
      var pick = parseInt(ch, 10);
      if (pick >= 1 && pick <= T.choices.length) chooseOption(pick - 1);
      return;
    }

    if (/\s/.test(ch)) {
      if (T.mode === 'type') submitWord();
      return;
    }

    var lower = ch.toLowerCase();
    if (!/[a-z0-9]/.test(lower)) return; // punctuation is never required, and never wrong

    // first letter: the right opening letter writes the whole word
    if (T.mode === 'first') {
      beginTyping();
      if (lower === T.tokens[T.i].core[0]) accept('done');
      else reject();
      updateStats();
      return;
    }

    beginTyping();

    var tok = T.tokens[T.i];
    if (T.buf.length >= Math.max(tok.core.length + 8, 18)) return;

    T.buf += lower;
    renderWord(T.i);

    // full length reached: take it if it is right, or close enough. A synonym waits for
    // the space, so a longer word is not cut short ("demonstrates" -> "demonstrate").
    if (T.buf.length >= tok.core.length) {
      if (T.buf === tok.core) accept('done');
      else if (isNearMiss(T.buf, tok.core)) accept('fixed');
      // on the very last word there is nothing left to overrun into, so a synonym
      // can land without waiting for a space that may never come
      else if (meaningOn() && nextTypable(T.i + 1) < 0 && sameMeaning(T.buf, tok.core)) accept('para');
    }
    updateStats();
  }

  function submitWord() {
    if (T.locked || !T.running || !T.buf.length) return;
    var typed = T.buf;
    var hit = resolve(typed);

    if (hit) {
      hit.skipped.forEach(fillIn);        // the fillers you left out
      if (hit.skipped.length) {
        T.i = hit.target;
        T.state[T.i] = 'current';
      }
      accept(hit.kind);
    } else if (meaningOn() && typed.length <= 2 && !FILLERS[T.tokens[T.i].core]) {
      T.buf = '';                          // leftovers such as the "s" of a longer ending
      renderWord(T.i);
    } else if (meaningOn() && FILLERS[typed] && !FILLERS[T.tokens[T.i].core]) {
      T.buf = '';                          // a filler the text does not have: ignore it
      renderWord(T.i);
    } else {
      reject();
    }
    updateStats();
  }

  // a filler word you skipped past is written in for you
  function fillIn(i) {
    T.state[i] = 'given';
    T.given++;
    renderWord(i);
  }

  function accept(kind) {
    T.state[T.i] = kind;
    if (kind === 'fixed') T.fixed++;
    else if (kind === 'para') T.para++;
    else T.exact++;
    renderWord(T.i);
    T.buf = '';
    T.i++;
    skipUntypable();
    if (T.i < T.tokens.length) {
      T.state[T.i] = 'current';
      renderWord(T.i);
      keepInView(T.i);
      buildChoices();
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

    // walk back over any fillers that were written in for you
    while (j > 0 && T.state[j] === 'given') { T.given--; T.state[j] = 'pending'; renderWord(j); j--; }
    while (j >= 0 && !T.tokens[j].core) j--;
    if (j < 0 || T.known[T.tokens[j].sent]) return;   // that is where your practice starts

    if (T.state[j] === 'fixed') T.fixed--;
    else if (T.state[j] === 'para') T.para--;
    else if (T.state[j] === 'given') T.given--;
    else T.exact--;
    for (var k = j; k <= T.i && k < T.tokens.length; k++) {
      T.state[k] = 'pending';
      renderWord(k);
    }
    T.i = j;
    T.state[T.i] = 'current';
    renderWord(T.i);
    buildChoices();
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

  /* ---- multiple choice ---- */

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  function buildChoices() {
    var box = $('#choices');
    box.innerHTML = '';
    T.choices = [];
    if (T.mode !== 'choice' || !T.running || T.i >= T.tokens.length) {
      box.hidden = true;
      return;
    }

    var answer = T.tokens[T.i];
    var seen = {};
    var pool = [];
    T.tokens.forEach(function (tok) {
      if (!tok.core || tok.core === answer.core || seen[tok.core]) return;
      seen[tok.core] = true;
      pool.push(tok);
    });

    // prefer decoys of a similar length, so shape alone does not give it away
    pool.sort(function (a, b) {
      return Math.abs(a.core.length - answer.core.length) - Math.abs(b.core.length - answer.core.length);
    });
    var options = shuffle(pool.slice(0, 8)).slice(0, 3);
    options.push(answer);
    shuffle(options);

    T.choices = options;
    options.forEach(function (tok, n) {
      var b = el('button', 'btn choice');
      b.appendChild(el('b', null, String(n + 1)));
      b.appendChild(document.createTextNode(tok.display));
      b.onclick = function () { chooseOption(n); focusCapture(); };
      box.appendChild(b);
    });
    box.hidden = false;
  }

  function chooseOption(n) {
    if (T.locked || !T.running || T.mode !== 'choice') return;
    var picked = T.choices[n];
    if (!picked) return;
    beginTyping();

    if (picked.core === T.tokens[T.i].core) {
      accept('done');
    } else {
      T.wrong++;
      var btn = $('#choices').children[n];
      if (btn) {
        btn.classList.add('wrong');
        setTimeout(function () { btn.classList.remove('wrong'); }, 450);
      }
    }
    updateStats();
  }

  /* ---- studying and peeking ---- */

  function setStudy(on) {
    T.studying = !!on && (!T.started || T.mode === 'read');
    $('#text').classList.toggle('hide', !T.studying);
    updateToolbar();
  }

  // peek at one word: it stays highlighted so you can see what needs work
  function peekWord(i) {
    var tok = T.tokens[i];
    if (!tok || !tok.core || T.known[tok.sent]) return;

    // read only: uncovering is free, and the word stays highlighted as one to work on
    if (T.mode === 'read') {
      if (T.open[i]) { delete T.open[i]; delete T.marked[i]; }
      else { T.open[i] = true; T.marked[i] = true; }
      renderWord(i);
      return;
    }

    if (T.locked || !T.running) return;

    // already on the page: marking it for attention is free
    if (T.state[i] !== 'pending' && T.state[i] !== 'current') {
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
    buildChoices();
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
    buildChoices();

    var seconds = T.start ? (Date.now() - T.start) / 1000 : 0;
    var clean = T.peeksUsed === 0 && T.wrong === 0;
    var perfect = clean && T.fixed === 0 && T.para === 0 && T.given === 0;

    $('#results-verdict').textContent = perfect
      ? 'Perfect recall — word for word.'
      : clean ? 'Clean run — the ideas were all there.' : 'Done. Run it again for a clean one.';
    $('#results').classList.toggle('plain', !clean);

    var parts = [wpm() + ' wpm', accuracy() + '% word for word'];
    if (T.fixed) parts.push(plural(T.fixed, 'autocorrect', 'autocorrects'));
    if (T.para) parts.push(plural(T.para, 'synonym', 'synonyms'));
    if (T.given) parts.push(plural(T.given, 'filler filled in', 'fillers filled in'));
    parts.push(plural(T.wrong, 'reject', 'rejects'));
    parts.push(plural(T.peeksUsed, 'peek', 'peeks'));
    parts.push(fmtTime(seconds));
    $('#results-text').textContent = parts.join('  ·  ');

    var deck = deckById(T.deckId);
    var hasNext = deck && T.cardIndex != null && T.cardIndex + 1 < deck.cards.length;
    $('#btn-next').hidden = !hasNext;

    $('#results').hidden = false;
    updateToolbar();
    if (markedCount()) {
      toast(plural(markedCount(), 'word', 'words') + ' highlighted to work on.');
    }
  }

  function attempts() { return T.exact + T.fixed + T.para + T.wrong; }

  function accuracy() {
    return attempts() ? Math.round(T.exact / attempts() * 100) : 100;
  }

  function wpm() {
    if (!T.start) return 0;
    var minutes = (Date.now() - T.start) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((T.exact + T.fixed + T.para) / minutes);
  }

  function fmtTime(seconds) {
    var s = Math.floor(seconds);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function updateStats() {
    var done = T.exact + T.fixed + T.para + T.given;
    $('#stat-progress').textContent = done + ' / ' + T.total;
    $('#stat-wpm').textContent = wpm();
    $('#stat-acc').textContent = accuracy() + '%';
    $('#stat-peeks').textContent = T.peeksLeft;
    $('#chip-peeks').classList.toggle('spent', T.peeksLeft === 0);
    $('#chip-peeks').lastChild.textContent = T.peeksLeft === 1 ? ' peek left' : ' peeks left';
    $('#stat-time').textContent = fmtTime(T.start ? (Date.now() - T.start) / 1000 : 0);
    $('#bar-fill').style.width = (T.total ? (done / T.total) * 100 : 0) + '%';
  }

  function modeName(mode) {
    return (MODES[mode] || MODES.type).name;
  }

  function setMode(mode) {
    if (!MODES[mode] || data.settings.mode === mode) return;
    data.settings.mode = mode;
    save();
    if ($('#view-type').hidden) {
      updateToolbar();
      return;
    }
    reset();
    focusCapture();
    toast(modeName(mode) + ' \u2014 starting the card again.');
  }

  function updateToolbar() {
    var mode = $('#view-type').hidden ? data.settings.mode : T.mode;
    Array.prototype.forEach.call(document.querySelectorAll('.btn.seg'), function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === data.settings.mode);
    });
    $('#mode-hint').textContent = (MODES[mode] || MODES.type).hint;
    $('#opt-fuzzy').closest('label').hidden = mode !== 'type';
    $('#opt-meaning').closest('label').hidden = mode !== 'type';

    var reading = mode === 'read';
    document.querySelector('.stats').hidden = reading;
    document.querySelector('.bar').hidden = reading;
    $('#legend').hidden = reading;
    $('#btn-peek').hidden = reading;
    $('#btn-restart').textContent = reading ? 'Cover all up' : 'Restart (Esc)';

    var study = $('#btn-study');
    study.textContent = T.studying ? 'Hide text' : 'Study text';
    study.disabled = !reading && (T.started || !T.running);
    study.title = T.started && !reading
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

  $('#opt-meaning').onchange = function () {
    data.settings.meaning = this.checked;
    save();
    focusCapture();
  };

  $('#btn-study').onclick = function () {
    if (T.started && T.mode !== 'read') {
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

  Array.prototype.forEach.call(document.querySelectorAll('.btn.seg'), function (btn) {
    btn.onclick = function () { setMode(btn.dataset.mode); };
  });

  $('#btn-untick').onclick = function () {
    T.known = {};
    saveKnown();
    reset();
    focusCapture();
    toast('All sentences are back in the run.');
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
    var blob = new Blob([JSON.stringify({ decks: data.decks, synonyms: data.synonyms }, null, 2)],
                        { type: 'application/json' });
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
              var card = { id: uid(), title: String(c.title || 'Untitled card'), text: String(c.text || '') };
              if (Array.isArray(c.known)) card.known = c.known;
              return card;
            })
          });
        });
        if (Array.isArray(parsed.synonyms)) {
          data.synonyms = data.synonyms.concat(parsed.synonyms);
          buildSynonymIndex();
          renderSynonyms();
        }
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

  /* ------------------------------------------------------------------ */
  /* your own synonyms                                                   */
  /* ------------------------------------------------------------------ */

  function renderSynonyms() {
    $('#syn-text').value = (data.synonyms || []).map(function (g) { return g.join(', '); }).join('\n');
    $('#syn-count').textContent = data.synonyms.length
      ? plural(data.synonyms.length, 'group', 'groups') + ' of your own'
      : 'none of your own yet';
  }

  $('#form-syn').addEventListener('submit', function (e) {
    e.preventDefault();
    var groups = $('#syn-text').value.split('\n').map(function (line) {
      var seen = {}, out = [];
      line.split(',').map(function (w) { return w.trim(); }).filter(Boolean).forEach(function (w) {
        var c = coreOf(w);
        if (c && !seen[c]) { seen[c] = true; out.push(w); }
      });
      return out;
    }).filter(function (g) { return g.length >= 2; });

    data.synonyms = groups;
    save();
    buildSynonymIndex();
    renderSynonyms();
    toast(groups.length ? 'Saved ' + plural(groups.length, 'synonym group', 'synonym groups')
                        : 'Your synonym groups are now empty');
  });

  /* ------------------------------------------------------------------ */

  load();
  buildSynonymIndex();
  renderSynonyms();
  renderDecks();
  updateToolbar();
  show('decks');
})();
