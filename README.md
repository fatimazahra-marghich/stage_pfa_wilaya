# 🏛️ Plateforme de Gestion des Congés et Autorisations (IJAZA)

> **Projet de Fin d'Année (PFA)** — Direction Régionale / Wilaya  
> Solution full-stack sécurisée pour la numérisation, l'instruction et le suivi des demandes de congés administratifs.

---

## 📌 Présentation du Projet

Le système **IJAZA** a été développé pour moderniser et automatiser les processus RH au sein de la Wilaya. La plateforme remplace les circuits papiers traditionnels par une gestion digitale complète, garantissant une meilleure traçabilité et une transparence accrue.

### Key Features
* 🔐 **Authentification & Contrôle d'Accès (RBAC) :** Espaces dédiés selon le rôle (*Employé*, *Chef de service*, *Administrateur RH*).
* 📝 **Gestion des Demandes :** Saisie en ligne, calcul automatique des jours consommés et vérification des soldes de congés.
* ⚡ **Workflow de Validation :** Circuit de validation multi-niveaux pour l'approbation ou le rejet des demandes.
* 📊 **Tableau de Bord & Reporting :** Visualisation en temps réel du calendrier d'équipe, des soldes globaux et génération de rapports.

---

## 🛠️ Architecture Technique

| Composant | Technologie | Rôle |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Interface utilisateur réactive et Single Page Application (SPA) |
| **UI Framework** | Tailwind CSS | Design moderne, responsive et composants sur-mesure |
| **Backend** | Django 5.x, DRF | API RESTful, logique métier, gestion de la sécurité et du JWT |
| **Base de Données** | SQLite (Dev) / PostgreSQL (Prod) | Stockage relationnel des utilisateurs, structures et demandes |
| **Gestionnaire de Version** | Git & GitHub | Suivi des versions avec stratégie multi-branches (`main`, `test`) |

---

## 📂 Organisation du Dépôt

```text
stage_pfa_wilaya/
├── backend/                  # API REST Django
│   ├── config/               # Configuration globale du projet Django
│   ├── users/                # App : Gestion des comptes et rôles
│   ├── conges/               # App : Demandes, soldes et types de congés
│   ├── organisation/         # App : Structures et services administratifs
│   ├── manage.py             # Script de gestion Django
│   └── requirements.txt      # Dépendances Python
│
└── ijaza-frontend/           # Client React (Vite)
    └── ijaza-frontend/       # Racine de l'application frontend
        ├── src/
        │   ├── api/          # Configuration Axios & Intercepteurs HTTP
        │   ├── components/   # Composants réutilisables (Sidebar, Badges...)
        │   ├── context/      # Contexte d'authentification (AuthContext)
        │   └── pages/        # Vues principales (Employé, Chef, Admin)
        ├── package.json      # Dépendances npm
        └── tailwind.config.js
