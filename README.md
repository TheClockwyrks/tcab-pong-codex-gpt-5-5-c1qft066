# Carom

Carom is a top-down paddle duel for the browser. Two players, or one player
against an AI opponent, rally a ball across a dark arena with two central
obstacles that turn every exchange into a bank-shot puzzle.

The signature mechanic is spin: hit the ball while your paddle is moving and the
ball curves after contact. A match is first to 11, win by 2.

## Install

```sh
npm ci
```

## Development

```sh
npm run dev
```

Vite serves the game with hot reload. Open the local URL it prints.

## Production Build

```sh
npm run build
```

The static site is written to `dist/`, with `dist/index.html` as its entry
point. It can be served as-is from a static host.

## Controls

- Left paddle: `W` / `S`
- Right paddle in Versus: `ArrowUp` / `ArrowDown`
- Solo: either movement key pair controls the player paddle
- Confirm menu item: `Enter` or `Space`
- Pause/resume: `P` or `Escape`
- Back: `Escape`
- Mute: `M`

The browser build also supports pointer and touch menu selection, plus the
engine's on-screen touch controls for paddle movement.

## Checks

```sh
npm run typecheck
npm run lint
npm run format
npm test
```
