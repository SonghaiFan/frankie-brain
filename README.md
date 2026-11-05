![Frankie Brain — current product banner](docs/readme/banner.png)

# Frankie Brain

Browser-based Schulte grid and quick-math training, with local history, configurable practice and replay.

## Features

- Practice peripheral attention with configurable Schulte grids, symbols and ordering.
- Train arithmetic with timed Quick Math sessions.
- Review results, history charts and Schulte replays stored in this browser.

## Getting started

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The training UI does not require a model API key.

## Project notes

Built with React, TypeScript, Vite and Tailwind CSS. Browser storage is local to this origin; histories do not automatically transfer between addresses or to the native iOS app.

## Development

```sh
npm run lint
npm run build
```

Banner sources and update instructions: [README artwork](docs/readme/README.md).
