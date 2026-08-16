# Ijaza — Frontend (React + Vite + Tailwind)

## Démarrage

```bash
npm install
npm run dev
```

L'app tourne sur `http://localhost:5173`. Assure-toi que le backend Django tourne
sur `http://127.0.0.1:8000` (voir `ijaza-backend/README.md`) — sinon rien ne se charge.

## Ce qui est fait

- **Auth JWT** complète (`src/context/AuthContext.jsx`, `src/api/axios.js`) avec
  refresh automatique du token.
- **Routing par rôle** (`src/App.jsx`) : Employé / Chef de service / Admin RH ont
  chacun leurs routes protégées.
- **Pages fonctionnelles et connectées à l'API** :
  - `pages/Login.jsx`
  - `pages/employe/Dashboard.jsx`, `NewRequest.jsx`, `History.jsx`
  - `pages/chef/PendingRequests.jsx` (avec les actions Valider/Refuser branchées
    sur `/demandes/{id}/valider_niveau1/`)
  - `pages/admin/GlobalBalances.jsx` (filtres Division en pilules)

## Ce qu'il te reste à faire (même structure à copier)

Chaque page suit le même schéma : `Layout` + `useEffect` qui appelle `api.get(...)`
+ un peu de JSX. Copie une page existante proche et adapte :

- `pages/chef/RequestDetail.jsx` — détail d'une demande + calendrier chevauchement
- `pages/chef/TeamCalendar.jsx` — vue mensuelle par agent
- `pages/chef/CorrectSolde.jsx` — mini-formulaire de correction (POST `/corrections-solde/`)
- `pages/admin/TypeConge.jsx` — cartes CRUD (GET/POST `/types-conge/`)
- `pages/admin/Structure.jsx` — arborescence Division > Service > Bureau
- `pages/admin/Reports.jsx` — graphiques (tu peux utiliser `recharts`, déjà dispo
  dans la plupart des setups Vite : `npm install recharts`)

## Design

Palette actuelle : noir/blanc + fuchsia `#E91E8C` en accent unique, coins arrondis
(`rounded-xl`/`rounded-2xl`), ombres douces (`shadow-sm`). Si tu changes la charte
(comme discuté), la couleur d'accent est centralisée dans `tailwind.config.js`
(`colors.accent`) — remplace aussi les quelques `#E91E8C` codés en dur dans les
composants (`Sidebar.jsx`, `StatutBadge.jsx`, `Login.jsx`) par `text-accent` /
`bg-accent` pour n'avoir qu'un seul endroit à changer la prochaine fois.
