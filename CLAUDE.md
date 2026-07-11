# Kanji Game — repère pour Claude Code

Ce repo contient un frontend terminé (V1, données mockées) et un backend Spring Boot + PostgreSQL fonctionnellement complet en local (auth, salons, moteur de jeu WebSocket). Selon ce sur quoi porte la session en cours, commencer par lire le bon document :

- **Brancher le frontend sur l'API backend réelle** (remplacer les mocks de `frontend/src/mocks/`) → lire `docs/backend/FRONTEND_INTEGRATION.md` en premier. Document autonome décrivant l'état exact de l'API testée (REST + WebSocket/STOMP), les gaps connus, et l'ordre suggéré pour brancher chaque écran.
- **Poursuivre le travail sur le backend / la base de données** (nouvelles fonctionnalités, corrections) → lire `docs/backend/SPECIFICATIONS_BACKEND.md` en premier (règles métier, schéma DB d'origine — toujours valable) puis `docs/backend/FRONTEND_INTEGRATION.md` §2 pour démarrer l'environnement local (Java/Maven/PostgreSQL sans droits admin, chemins exacts).
- **Évolutions/corrections sur le frontend seul** (sans toucher au backend, `frontend/`) → lire `EVOLUTIONS.md` à la racine, qui contient la file d'attente des demandes de Damien et le mode opératoire pour les traiter.
- **Contexte produit d'origine** (specs fonctionnelles complètes, maquettes, design tokens) → `docs/design-handoff/README.md` et `docs/design-handoff/SPECIFICATIONS_FONCTIONNELLES.md`.

## Repère rapide

- `frontend/` : Vite + React + TypeScript, CSS Modules (pas de Tailwind), react-router-dom. Déployé automatiquement sur GitHub Pages (`.github/workflows/deploy.yml`) à chaque push sur `master` touchant `frontend/`. Toujours sur données mockées (phase d'intégration API pas encore commencée).
- `backend/` : Spring Boot 3.5.16 + Java 21 + PostgreSQL + Flyway + WebSocket/STOMP. Fonctionnellement complet et testé en local (voir `docs/backend/FRONTEND_INTEGRATION.md` §1 pour le détail). Pas encore déployé (dev local uniquement).
- Méthode de travail attendue sur ce projet : construire une fonctionnalité, la vérifier soi-même (dans le navigateur et/ou par des tests manuels de l'API, pas seulement compiler), puis la proposer à Damien pour validation avant de passer à la suite.
