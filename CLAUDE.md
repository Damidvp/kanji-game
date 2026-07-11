# Kanji Game — repère pour Claude Code

Ce repo contient un frontend terminé (V1, données mockées) et un backend à venir. Selon ce sur quoi porte la session en cours, commencer par lire le bon document :

- **Travail sur le backend / la base de données** (nouveau dossier `backend/` à créer, Spring Boot + PostgreSQL) → lire `docs/backend/SPECIFICATIONS_BACKEND.md` en premier. C'est un document autonome, écrit pour ne dépendre d'aucun contexte de conversation préalable.
- **Évolutions/corrections sur le frontend** (`frontend/`) → lire `EVOLUTIONS.md` à la racine, qui contient la file d'attente des demandes de Damien et le mode opératoire pour les traiter.
- **Contexte produit d'origine** (specs fonctionnelles complètes, maquettes, design tokens) → `docs/design-handoff/README.md` et `docs/design-handoff/SPECIFICATIONS_FONCTIONNELLES.md`.

## Repère rapide

- `frontend/` : Vite + React + TypeScript, CSS Modules (pas de Tailwind), react-router-dom. Déployé automatiquement sur GitHub Pages (`.github/workflows/deploy.yml`) à chaque push sur `master` touchant `frontend/`.
- `backend/` : n'existe pas encore — à scaffolder selon `docs/backend/SPECIFICATIONS_BACKEND.md`.
- Méthode de travail attendue sur ce projet : construire une fonctionnalité, la vérifier soi-même dans le navigateur (pas seulement compiler), puis la proposer à Damien pour validation avant de passer à la suite.
