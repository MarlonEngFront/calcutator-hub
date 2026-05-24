# Voiston Calculator Hub

High-performance IOL calculator hub. 6 calculators in one place.

**Status:** v0.1.0 MVP scaffold

---

## Features

- 📤 **Upload & Parse:** Biometry data (PDF, JPG, PNG) with Web Worker parsing
- 🔢 **6 Calculators:** TECNIS, APACRS (True-K & Barrett), ESCRS, BRASCRS (2x)
- 💾 **Persistent biometry:** Zustand store with localStorage fallback
- 📊 **Comparativo:** Side-by-side results with lightbox screenshots
- 🚀 **Performance:** TanStack Query, Framer Motion, Tailwind 4

---

## Architecture

```
voiston-calculator-hub/
├── app/
│   ├── (pages) upload, validate, calculators, results
│   ├── components/ (TODO: UploadZone, CalculatorGrid, ResultsTable)
│   ├── stores/ zustand biometry store
│   ├── lib/ gateway client, calculator types
│   └── actions/ (TODO: server actions if needed)
├── ESCRS_SPIKE.md spike plan for ESCRS adapter
└── package.json Next.js 16 + Zustand + Framer Motion + TanStack Query
```

---

## Quick Start

```bash
# Install
npm install

# Dev server (port 3003)
npm run dev

# Visit http://localhost:3003
```

---

## Integration with Gateway

Gateway URL: `process.env.NEXT_PUBLIC_EXTERNAL_CALC_GATEWAY_URL`

API Key: `process.env.NEXT_PUBLIC_GATEWAY_API_KEY`

**Current:** 2 adapters ready (TECNIS, APACRS True-K)
**Next:** ESCRS IOL (spike → implementation → golden tests)

---

## Roadmap

- [ ] **v0.1 - MVP:** Upload + 2 calc + validation + basic results
- [ ] **v0.2 - ESCRS:** Spike DOM mapping → Adapter implementation
- [ ] **v0.3 - UI Polish:** Framer Motion animations, Sonner toasts, lightbox
- [ ] **v0.4 - BRASCRS:** Auth flow integration
- [ ] **v1.0 - Launch:** Golden tests, monitoring, SLA per calculator

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## Next Steps

1. **npm install** to set up deps
2. **Spike ESCRS:** `ESCRS_SPIKE.md` — explore DOM, map fields, test parsing
3. **Build ESCRS adapter** in gateway (parallel work)
4. **Implement upload parser** from jjvisionpro extraction
5. **Add results comparativo** with screenshot lightbox

---

## Notes

- Reusing upload/parse patterns from jjvisionpro
- Gateway expects Zod-validated `CalculatorRequest` payload
- Biometry persists in sessionStorage (per session) or localStorage (cross-session)
- APACRS may hit Cloudflare blocks — gateway has rate limiting (Fase 1)

