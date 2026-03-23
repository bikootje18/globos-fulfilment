# Fulfillment Scanner

Warehouse fulfillment scanner app — React frontend + Node.js backend + Supabase.

## Project structure

```
fulfillment-scanner/
├── frontend/        React + Vite app (runs on tablets in browser)
├── backend/         Node.js + Express API
└── README.md
```

## Quick start

### 1. Set up Supabase
- Create a free project at https://supabase.com
- Run the SQL in `backend/supabase-schema.sql` in the Supabase SQL editor
- Copy your project URL and anon key

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials in .env
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in your backend URL in .env
npm install
npm run dev
```

### 4. Open in browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## How scanning works
The Bluetooth pistol grip scanner acts as a keyboard. The app keeps a hidden
input always focused — when the operator pulls the trigger, the barcode gets
typed in and the app reacts instantly. No clicks needed.
