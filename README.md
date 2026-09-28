# Memorise

A tiny, no-build website for learning essays by heart, monkeytype-style — built so you
cannot cheat your way through a paragraph.

- **Decks** = one essay. **Cards** inside a deck = its paragraphs.
- Press **Start** on a card (or *Type the whole essay*) and type it from memory.
- The text is hidden. Each word appears once you have typed it.
- Progress is never saved mid-way: switching cards always restarts from the beginning.

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
- The end screen grades the run: **Perfect recall** (no peeks, rejects or autocorrects),
  **Clean run** (no peeks or rejects), or "run it again".

## Typing rules

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

- Type normally; **space** submits a word; **Backspace** steps back.
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
