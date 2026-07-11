# Kanji Game

Plateforme de mini-jeux pour réviser les kanji Jōyō (N5 à N1), seul ou à plusieurs (jusqu'à 8 joueurs).

## Structure du repo

- `frontend/` — application React (Vite + TypeScript). V1 avec données mockées, sans backend.
- `backend/` — API Spring Boot + PostgreSQL (à venir, phase 2 — voir `docs/backend/SPECIFICATIONS_BACKEND.md`).
- `docs/design-handoff/` — spécifications fonctionnelles et maquettes de référence issues du handoff design.
- `docs/backend/SPECIFICATIONS_BACKEND.md` — spec autonome pour l'implémentation du backend (modèle de données, API, hébergement).
- `EVOLUTIONS.md` — file d'attente des demandes d'évolution/correction sur le frontend.

## Développement — frontend

```bash
cd frontend
npm install
npm run dev
```

## État du projet

Les 7 écrans de la V1 frontend sont construits et déployés (données mockées, multijoueur simulé côté client). Prochaine étape : backend Spring Boot + PostgreSQL (voir `docs/backend/SPECIFICATIONS_BACKEND.md`). Les évolutions/corrections sur le frontend se suivent désormais via `EVOLUTIONS.md`.
