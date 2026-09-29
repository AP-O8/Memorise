# Memorise

A tiny, no-build website for learning essays by heart, monkeytype-style — built so you
cannot cheat your way through a paragraph.

- **Decks** = one essay. **Cards** inside a deck = its paragraphs.
- Press **Start** on a card (or *Type the whole essay*) and type it from memory.
- The text is hidden. Each word appears once you have typed it.
- Progress is never saved mid-way: switching cards always restarts from the beginning.

## Four practice modes

Pick one with the buttons at the top of a card. Switching mode starts the card again, and your
choice is remembered.

- **Type it** — type every word out. The full drill.
- **First letter** — type only the first letter of the next word and the rest of it is written
  for you. The letter you supplied stays highlighted, so you can see what you actually recalled.
  Fast way to drill the order of an essay.
- **Multiple choice** — pick the next word from four options: click one, or press **1**–**4**.
  The decoys are other words from the same paragraph, picked for a similar length so the shape
  does not give the answer away. The easiest mode — good for a first pass over new material.

- **Read only** — nothing to type. The paragraph is laid out as a first-letters prompt sheet:

  ```
  M_____ p_______ S____ a_ a c_____ s______.
  ```

  Punctuation stays visible, so you can recite it aloud from the shape of the sentence. Click any
  word to uncover it (free, no peek spent) and click again to cover it up; the words you uncovered
  stay highlighted as the ones to work on. **Study text** shows the whole paragraph, **Cover all
  up** hides it again.

The peek rules below apply to the three typing modes.

## Starting where you left off: sentence ticks

Each card is split into sentences, and every sentence has a numbered tick box in front of it.

- **Tick a sentence you already know.** It is written in on the page in grey and stepped over,
  so typing starts at the first sentence you have *not* ticked — no more retyping the opening
  two sentences to get at the third.
- Ticks can be anywhere: tick sentence 2 and you will type 1 and 3, with the cursor jumping over
  the middle one.
- The word count, progress bar and score only cover the sentences you are actually typing.
- **Ticks are kept with the card**, so they survive restarts, mode switches and closing the
  browser. **Untick all** puts the whole paragraph back, and editing a card's text clears its
  ticks (the sentences have changed).
- They work the same in all three modes.

## The rules that make it work

Recall only sticks if forgetting costs you something, so the crutches are deliberately tight:

- **Study before, not during.** *Study text* shows the whole paragraph, but only until your
  first keystroke. After that the full text stays hidden until the run ends — no reading your
  way out of a blank.
- **One peek per run.** *Peek word* uncovers the word you are on; clicking any word uncovers
  that one. You get one.
- **A second peek restarts the card.** The word is shown for a couple of seconds so you can
  read it, then you are back at word one. Forgetting a word costs you the paragraph, which is
  exactly why the word sticks next time.
- **Peek highlights persist.** Every word you peeked at stays highlighted for as long as you
  stay on that card, including across restarts — so your weak spots pile up in front of you.
  Click a highlight to clear it. Marking a word you have already typed is free.
- The end screen grades the run: **Perfect recall** (word for word, no help at all),
  **Clean run** (nothing rejected, ideas all there), or "run it again", and breaks down how many
  words were autocorrected, accepted as synonyms, or filled in for you.

## Meaning, not just wording (Type it mode)

If the point is remembering the *ideas*, being marked wrong for a synonym is noise. With
**Accept synonyms & skipped fillers** on (the default):

- **Synonyms count.** Type `show` where the essay says `illustrates` and it is accepted — the
  real word is then written in blue, so you still see the wording you are aiming for.
- **Word endings do not matter.** `showing` for `shows`, `demonstrated` for `demonstrates`,
  `hurry` for `hurried`.
- **Skipped fillers are filled in.** If you go straight from `illustrates` to `theocratic`, the
  `that the` in between is written in for you in grey italics — up to two small function words
  (`that`, `the`, `of`, `is`, `and`…) at a time, and only when the next word you type is right.
- **Extra fillers are ignored.** Typing a `the` the essay does not have is not counted wrong.
- Switch it off for word-perfect practice; then only spelling slips are forgiven.

Roughly forty groups of common essay words are built in — show / illustrate / demonstrate /
convey / reveal, suggest / imply / indicate, emphasise / stress / underline, undermine / erode /
subvert, and so on. For anything specific to your text, open **Synonyms** on the decks screen and
add your own: one group per line, words separated by commas.

```
theocratic, religious, puritanical
hysteria, mass panic, frenzy
```

Your groups are saved with your decks and travel in the backup file.

Synonyms apply to **Type it** only. First letter compares one letter, multiple choice gives you
the exact words to pick from, and read only never judges anything.

## Typing rules (Type it mode)

- **Capitals and punctuation are ignored.** You never type full stops, commas, apostrophes,
  speech marks, dashes or capitals — they appear on their own when the word is accepted.
  Typing them anyway is harmless.
- A word is accepted the moment you spell it right. Press **space** to submit a word that has
  too few or too many letters.
- **Autocorrect** (on by default) accepts a near-miss and shows the word in yellow: one slip
  for words of 4-7 letters, two for longer ones, and a straight swap of two letters for
  3-letter words (`teh` → `the`). 1-2 letter words must be exact. Being one letter off a
  *different* real word (`farce` for `force`) is accepted too — that is the price of
  autocorrect. Turn it off with *Autocorrect near-misses* for strict spelling.
- Anything further off is rejected: the word flashes red and you stay on it.
- **Backspace** deletes a letter, and steps back to the previous word when the current one is
  empty.

## Keys

- Type normally; **space** submits a word; **Backspace** steps back a letter, or a word when
  the current one is empty (in first-letter and multiple-choice modes it steps back a word).
- **1**–**4** pick an option in multiple choice.
- **Esc** or **Cmd/Ctrl+R** restarts the card. While you are typing, Cmd/Ctrl+R is taken over
  from the browser's reload; everywhere else in the app it reloads as normal. Esc is the one to
  lean on — a browser that refuses to hand over its reload shortcut would reload the page and
  drop you back at the deck list.
- On the results panel, **Enter** goes to the next card (or restarts the last one).

## Managing decks and cards

- **Rename** turns the deck row into a text box: edit, then **Save** (or press Enter);
  **Cancel** or Escape backs out.
- **Delete** asks first: the button changes to **Sure?** and only the second click deletes.
  It disarms itself after four seconds. Same for cards.
- Cards can be reordered with the arrow buttons; *Type the whole essay* runs them in order,
  and finishing a card offers **Next card**.
- The app never uses browser pop-ups, so nothing breaks in viewers that block them.

## Saving your essays

Decks are stored in your browser's `localStorage`, so they stay there between visits on that
browser — you never re-upload anything. Use **Export backup** / **Import backup** (JSON file)
to move decks to another browser or device, or to keep a copy in this repo.

Note: decks are per-browser and per-site. Clearing site data wipes them, so export a backup now
and then.

## Running it

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

## Putting it on GitHub Pages

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.
The site is plain HTML/CSS/JS with no build step, so it works as-is.
