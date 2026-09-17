# UTSAVX Frontend

## Structure

```
src/
  api/                 Axios client + endpoint helpers
  components/
    auth/              Route guards
    events/            Shared event UI
    layout/            Header, Footer
  data/                Demo/fallback catalog
  features/
    manager/           Organizer workspace + create-event flow
  lib/                 Shared helpers (money, unwrap)
  pages/               Public/buyer route screens
  routes/              Route table
  store/               Redux store + slices
  styles/              Global CSS / Tailwind
  App.jsx              App shell
  main.jsx             Entry
```

## Scripts

```bash
npm run dev      # Vite on :5173 (proxies /api → :5050)
npm run build
```
