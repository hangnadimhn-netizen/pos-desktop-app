## Struktur folder target

```text
Frontend
├── app/
├── modules/
│   ├── auth/
│   │   ├── pages/
│   │   └── store/
│   ├── pos/
│   │   ├── pages/
│   │   └── store/
│   └── promotion/
│       ├── pages/
│       └── store/
│   ├── management/
│   │   ├── pages/
│   │   └── store/
│   ├── reports/
│   │   ├── pages/
│   │   └── store/
│   └── settings/
│       ├── pages/
│       └── store/
├── shared/
│   ├── components/
│   │   └──ui/
│   ├── layouts/
│   ├── hooks/
│   ├── utils/
│   └── services/
└── assets/

Backend
└── src-tauri/src/
    ├── commands/
    │   └── mod.rs
    ├── services/
    │   └── mod.rs
    ├── repository/
    │   └── mod.rs
    ├── models/
    │   └── mod.rs
    ├── database/
    │   └── mod.rs
    ├── utils/
    │   └── mod.rs
    └── main.rs
```

## Library yang dipakai

- Frontend state: `zustand`
- Routing: `react-router-dom`
- Validation: `zod` + `react-hook-form`
- Backend DB access: `sqlx`
- Error handling: `thiserror`
- Async runtime: `tokio`

## Catatan

- Boilerplate Rust pada folder `src-tauri/src/` sudah disiapkan untuk `main.rs`, command dasar, dan koneksi SQLite pool.
- Koneksi database default mengarah ke `sqlite://data/pos_kasir.db`.
- Pada Step 3, kita bisa langsung melanjutkan ke `models`, `repository`, lalu `services` per modul.
