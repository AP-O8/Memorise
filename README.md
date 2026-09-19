# Memorise

A tiny, no-build website for learning essays by heart, monkeytype-style.

- **Decks** = one essay. **Cards** inside a deck = its paragraphs.
- Press **Start** on a card (or *Type the whole essay*) and type it from memory.
- The text is hidden. Each word appears once you have typed it.
- Progress is never saved mid-way: switching cards always restarts from the beginning.

## Typing rules

- **Capitals and punctuation are ignored.** You never type full stops, commas,
  apostrophes, speech marks, dashes or capitals — they appear on their own when the
  word is accepted. Typing them anyway is harmless; they are simply ignored.
- A word is accepted the moment you spell it right. Press **space** to submit a word
  that has too few or too many letters.
- **Autocorrect** (on by default) accepts a near-miss and shows the word in yellow:
  one slip for words of 4-7 letters, two for longer ones, and a straight swap of two
  letters for 3-letter words (`teh` → `the`). 1-2 letter words must be exact.
  Being one letter off a *different* real word (`farce` for `force`) is accepted too —
  that is the price of autocorrect. Turn it off with *Accept near-misses* for strict spelling.
- Anything further off is rejected: the word flashes red and you stay on it.
- **Backspace** deletes a letter, and steps back to the previous word when the current
  one is empty.
- The end screen reports wpm, first-time accuracy, and how many words were
  autocorrected or rejected.

## Saving your essays

Decks are stored in your browser's `localStorage`, so they stay there between
visits on that browser — you never re-upload anything. Use **Export backup** /
**Import backup** (JSON file) to move decks to another browser, device, or to keep
a copy in this repo.

Note: decks are per-browser and per-site. Clearing site data wipes them, so export
a backup now and then.

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

## Keys

- Type normally; **space** submits a word; **Backspace** steps back.
- **Peek** reveals the full text; **Restart** starts the card over.
