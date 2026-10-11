# React + Vite

## Neighborhood map

Browse → Neighborhood map shows filtered nearby books on an interactive Leaflet map.
Satellite is the default; Street switches to OpenStreetMap. Select a book pin to open
its detail card. Search, genre, condition, and radius apply to both list and map.

The school demo uses Esri's public World Imagery tiles without an API key. Imagery
requires an internet connection and is not live. Keep the visible provider credits.
Esri imagery is used under its [noncommercial service terms](https://www.esri.com/en-us/legal/terms/web-site-service).
Revisit licensing before commercial use. Street tiles follow the
[OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
Demo book locations are generated near the location chosen during onboarding.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
