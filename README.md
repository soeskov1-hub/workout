# 💪 Workout Tracker

En moderne, mobile-optimeret workout tracking app bygget med React, TypeScript, Vite og Supabase.

## ✨ Features

- ✅ **Templates Management**: Opret og vedligehold predefinerede workout templates
- ✅ **Quick Workout Start**: Vælg dato og template, start workout med ét klik
- ✅ **Set Tracking**: Registrer sets, reps og kg hurtigt og intuitivt
- ✅ **Smart Weight Suggestions**: Autoforslag baseret på historik og progressive overload
- ✅ **Exercise History**: Se "sidst brugt", "bedste sæt", og estimeret 1RM
- ✅ **Workout History**: Liste og kalender view med søgning
- ✅ **Clone Workouts**: Kopiér tidligere workouts til i dag
- ✅ **Dark/Light Mode**: Fuld tema support
- ✅ **Mobile First**: Store touch targets og optimeret UI til telefon
- ✅ **Offline Ready**: Fungerer med Supabase for data persistering

## 🚀 Kom i gang

### Forudsætninger

- Node.js 18+ 
- npm eller pnpm

### Installation

1. Installer dependencies:
```bash
npm install
```

2. Seed database med demo data:
```bash
npm run seed
```

3. Start development server:
```bash
npm run dev
```

4. Åbn [http://localhost:3000](http://localhost:3000) i din browser

## 📱 App Struktur

### Sider

- **Dashboard** (`/`): Start nye workouts, se stats og seneste workouts
- **Templates** (`/templates`): CRUD for workout templates
- **Workout Detail** (`/workout/:id`): Aktiv workout med set tracking
- **History** (`/history`): Se og søg i tidligere workouts, kalender view

### Database Schema (Supabase)

- `templates`: Workout templates
- `template_exercises`: Øvelser i templates
- `workouts`: Individuelle workouts
- `exercises`: Øvelser i en workout
- `sets`: Individuelle sets med reps, kg, RPE

## 🎯 Vægtforslag Algoritme

Appen bruger smart logik til at foreslå vægt:

1. **Sidst brugt**: Vægten fra sidste gennemførte workout
2. **Bedste sæt**: Højeste vægt nogensinde brugt
3. **Estimeret 1RM**: Beregnet med Brzycki formel: `weight / (1.0278 - 0.0278 * reps)`
4. **Foreslået**: Sidst brugt + 2.5kg for progressiv overload

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Notifications**: Sonner
- **Charts**: Recharts
- **Date Utils**: date-fns

## 📦 Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run seed       # Seed database with demo data
```

## 🎨 Design Principper

- **Mobile First**: Designet til telefon fra starten
- **Large Touch Targets**: Minimum 48px høje knapper
- **Quick Input**: Numeriske tastaturer til tal input
- **Visual Feedback**: Toast notifications og loading states
- **Dark Mode**: Fuld support for mørkt tema

## 🔮 Næste Steps (Phase 2)

- Deployment til Vercel
- Custom domain
- PWA support for installation
- Progression grafer pr. øvelse
- Eksport af data

## 📄 Licens

MIT

---

Bygget med ❤️ til effektiv workout tracking
