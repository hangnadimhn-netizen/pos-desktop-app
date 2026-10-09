Dokumen ini menyiapkan fondasi proyek POS berbasis `Tauri + React + TypeScript + Tailwind CSS + SQLite`.

## Urutan inisialisasi

1. Pastikan tool berikut sudah tersedia
   - `Node.js` 20+
   - `Rust` stable
   - `cargo`
   - `sqlx-cli`
   - `Tauri CLI`

2. Inisialisasi frontend React + TypeScript

```powershell
npm create vite@latest . -- --template react-ts
```

3. Install dependency frontend utama

```powershell
npm install react-router-dom zustand zod react-hook-form clsx
npm install -D tailwindcss postcss autoprefixer
```

4. Inisialisasi Tailwind CSS

```powershell
npx tailwindcss init -p
```

5. Tambahkan Tauri

```powershell
npm install @tauri-apps/api
npm install -D @tauri-apps/cli
npx tauri init
```

6. Tambahkan dependency Rust untuk backend

```powershell
cargo add tauri --manifest-path .\src-tauri\Cargo.toml
cargo add serde --features derive --manifest-path .\src-tauri\Cargo.toml
cargo add serde_json --manifest-path .\src-tauri\Cargo.toml
cargo add tokio --features full --manifest-path .\src-tauri\Cargo.toml
cargo add sqlx --features runtime-tokio-rustls,sqlite,macros,migrate --manifest-path .\src-tauri\Cargo.toml
cargo add thiserror --manifest-path .\src-tauri\Cargo.toml
cargo add uuid --features v4,serde --manifest-path .\src-tauri\Cargo.toml
cargo add dotenvy --manifest-path .\src-tauri\Cargo.toml
```

7. Siapkan file environment

```powershell
Copy-Item '.\.env.example' '.\.env'
```

8. Jalankan project

```powershell
npm install
npm run tauri dev
```

## Catatan

- Boilerplate Rust pada folder `src-tauri/src/` sudah disiapkan untuk `main.rs`, command dasar, dan koneksi SQLite pool.
- Koneksi database default mengarah ke `sqlite://data/pos_kasir.db`.
- Pada Step 3, kita bisa langsung melanjutkan ke `models`, `repository`, lalu `services` per modul.
