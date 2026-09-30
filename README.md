# YOYO GAMES

Eight browser games in one folder. No framework, no build step, and nothing to `npm install`  it's just files.

Open `index.html` and a small panel comes up with a list. Arrow keys to move, Enter or click to play. That's the entire startup process, and I'd like to keep it that way.

The name is YOYO because I couldn't think of a better one and by then the folder was already called that.

This started out as Snake, then I got bored one weekend and kept going.

## What's in here

**Chess** is the one that took the longest. `JS/chess.js` runs about 1,650 lines and it's roughly a third of all the JavaScript in this repo. Castling, en passant, promotion, draws. Eval bar down the side, move list, sound effects you can switch off, clocks (unlimited, 1+0, 3+0, 5+0, 10+0, 15+10), and a rematch offer the other person has to accept. Three ways to play: the computer, somebody on the same keyboard, or somebody over the internet.

**Wordle** lets you pick 4, 5 or 6 letters, and it keeps a separate streak for each length. The answer gets drawn once and then stays the same for the rest of the day on that machine, so you can't just refresh until something easy shows up. There's an on-screen keyboard, so it works one-handed on a phone. The answer lists live inside `wordle.js`, and it will try to grab a bigger guess dictionary from a CDN on top of those if that fails you get the smaller embedded list, which was the plan anyway.

**Sudoku** generates puzzles in the browser rather than pulling them from anywhere. Four levels, named by how many clues you start with: easy 44, normal 36, hard 28, evil 23. Notes mode (`N`), undo (`Z`), hints, a timer, and a mistake counter that does not go easy on you.

**Pong**  against the computer at easy, normal or hard, two people sharing a keyboard, or online. First to 11.

**Snake**  slow, normal or fast. Best score is remembered. On a touchscreen you tap the spot you want to head for; on a keyboard it's the arrow keys.

**Tic Tac Toe** has the same three modes as Pong. It keeps score across rounds and tracks draws separately, which is more bookkeeping than this game usually bothers with.

**Memory** is 4×4, 6×4 or 6×6. Counts your moves and keeps a best-of per difficulty.

**2048** keeps your best score and asks before ending the game when you actually reach 2048, instead of cutting you off at the moment you were finally enjoying yourself.

## Running it

Double-click `index.html`. That's genuinely all. If you prefer serving it over http:

```
python -m http.server 8000
```

Then go to `localhost:8000`. Both routes work, I use whichever is closer.

Three things reach for the internet:

Online multiplayer (chess, pong, tic tac toe) loads PeerJS from unpkg and connects host-to-guest through a short room code. The host makes a code, the other person types it in. Both of you need to be online for it.

The chess engine tries to pull Stockfish 10.0.2 from a CDN. If that request fails  offline, blocked by your network, CDN being CDN it quietly falls back to a simple evaluator I wrote myself: piece values, a bit of centre control, some randomness so it isn't identical every game. It plays legal, sensible-ish moves. It is not Stockfish and you will be able to tell.

Wordle asks a CDN for a couple of big public word lists so the guess dictionary is roomier than the one I embedded. Failures there are swallowed; you keep playing with the built-in words.

The Sudoku generator and the rest need nothing at all. Pull the ethernet cable and Snake, Memory, 2048, Sudoku, and the whole menu behave exactly the same.

## Controls

The launcher and every in-game menu work the same way: arrows to move through the list, Enter to choose, Esc to pause or back out. Almost all of the menu items are clickable too, so the mouse is a valid way through the whole thing.

- **Snake**: arrow keys.
- **2048**: arrow keys, or swipe on the board.
- **Wordle**: type normally, or tap the on-screen keys.
- **Sudoku**: click a cell, then press `1`–`9`. Backspace clears, `N` notes, `Z` undo.
- **Memory**: arrows or WASD to move the cursor, Enter to flip.
- **Chess / Tic Tac Toe**: click to pick up and place. The board handles it.
- **Pong**: `W`/`S` and `↑`/`↓`. Both steer your paddle when you're playing the computer, and they split between the two paddles when there's a person on each side. The paddle also tracks your pointer across the court.

## Folder layout

```
index.html      the launcher
HTML/           one page per game
CSS/            one stylesheet per game
JS/             one script per game
```

Every game keeps the same name across all three folders, so `sudoku.html`, `sudoku.css` and `sudoku.js` line up without hunting. Adding a ninth game means three new files and one extra `<li>` in `index.html`.

## Where your scores live

Preferences and bests go into `localStorage` under names like `yoyosnakebest`, `yoyosudokudiff` and `wordle-streak-5`. There is no account and no server. Clear your browser data and you start fresh, which I consider a feature.

## Things I haven't got around to

`chess.js` should be split into rules, engine and UI — three files instead of one and it's the main reason the repo feels lopsided. There's no LICENSE yet, so ask before you put this somewhere public. Mobile is fine for Snake, 2048 and Wordle, and passable for the menu-driven games, but Pong and Chess are really desktop things.
