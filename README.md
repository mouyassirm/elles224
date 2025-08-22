# 📦 ELLES 224 by HikIrfane - Application de Gestion de Stock

Une application fullstack complète pour la gestion de stock, des mouvements et des finances, construite avec FastAPI (backend) et React (frontend).

## 🚀 Fonctionnalités

### Backend (FastAPI)
- **Gestion des articles** : CRUD complet avec référence unique, nom, quantité, prix unitaire
- **Gestion des mouvements** : Achat/Vente avec mise à jour automatique du stock
- **Gestion financière** : Enregistrement automatique des ventes avec calculs de réductions
- **API REST** : Endpoints complets pour toutes les opérations
- **Base de données** : SQLite avec SQLAlchemy ORM

### Frontend (React)
- **Dashboard** : Vue d'ensemble avec métriques clés et graphiques
- **Gestion des articles** : Interface complète pour la gestion du stock
- **Gestion des mouvements** : Enregistrement des achats et ventes
- **Gestion financière** : Suivi des ventes et indicateurs financiers
- **Interface moderne** : TailwindCSS + shadcn/ui, responsive et intuitive

## 🛠️ Technologies utilisées

### Backend
- **FastAPI** : Framework web moderne et rapide
- **SQLAlchemy** : ORM pour la gestion de la base de données
- **SQLite** : Base de données légère et locale
- **Pydantic** : Validation et sérialisation des données
- **Alembic** : Gestion des migrations de base de données

### Frontend
- **React 18** : Bibliothèque UI moderne
- **TypeScript** : Typage statique pour la robustesse
- **Vite** : Outil de build rapide
- **TailwindCSS** : Framework CSS utilitaire
- **shadcn/ui** : Composants UI réutilisables
- **Recharts** : Bibliothèque de graphiques
- **React Router** : Navigation côté client

## 📁 Structure du projet

```
stock-management/
├── backend/                 # Application FastAPI
│   ├── __init__.py
│   ├── main.py             # Point d'entrée FastAPI
│   ├── config.py           # Configuration
│   ├── database.py         # Modèles et configuration DB
│   ├── schemas.py          # Schémas Pydantic
│   ├── services.py         # Logique métier
│   └── routers/            # Routes API
│       ├── __init__.py
│       ├── stock.py        # Gestion des articles
│       ├── movements.py    # Gestion des mouvements
│       ├── finance.py      # Gestion financière
│       └── reports.py      # Rapports et analytics
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   │   ├── ui/         # Composants shadcn/ui
│   │   │   └── Layout.tsx  # Layout principal
│   │   ├── pages/          # Pages de l'application
│   │   ├── hooks/          # Hooks personnalisés
│   │   └── lib/            # Utilitaires
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── requirements.txt         # Dépendances Python
└── README.md
```

## 🚀 Installation et lancement

### Prérequis
- **Python 3.8+**
- **Node.js 16+**
- **npm ou yarn**

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd stock-management
```

### 2. Configuration du backend
```bash
# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Installer les dépendances (backend)
pip install -r backend/requirements.txt
```

### 3. Configuration du frontend
```bash
cd frontend

# Installer les dépendances
npm install
```

### 4. Lancement de l'application

#### Terminal 1 - Backend
```bash
# Depuis la racine du projet
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend
```bash
# Depuis le dossier frontend
npm run dev
```

L'application sera accessible sur :
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs

## 📖 Utilisation

### 1. Première utilisation
1. Lancez le backend et le frontend
2. Accédez à http://localhost:3000
3. Commencez par ajouter quelques articles dans la section "Gestion des articles"

### 2. Gestion des articles
- **Ajouter un article** : Remplissez le formulaire avec référence, nom, prix unitaire
- **Modifier** : Cliquez sur l'icône de modification
- **Supprimer** : Cliquez sur l'icône de suppression
- **Rechercher** : Utilisez la barre de recherche pour filtrer les articles

### 3. Gestion des mouvements
- **Achat** : Enregistrez l'arrivée de nouveaux articles
- **Vente** : Enregistrez la sortie avec option de réduction
- **Stock automatique** : Les quantités se mettent à jour automatiquement

### 4. Suivi financier
- **Ventes** : Historique complet des ventes avec calculs automatiques
- **Revenus** : Suivi des revenus par période
- **Indicateurs** : Meilleures ventes, marges estimées

### 5. Dashboard
- **Métriques clés** : Vue d'ensemble du stock et des finances
- **Graphiques** : Évolution des ventes et volumes
- **Alertes** : Articles en rupture de stock

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env` dans le dossier `backend/` :

```env
# Base de données
DATABASE_URL=sqlite:///./stock_management.db

# API
API_TITLE=Stock Management API
API_VERSION=1.0.0

# Sécurité
SECRET_KEY=votre-cle-secrete-changez-en-production

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Base de données
- **SQLite** : Utilisé par défaut (fichier local)
- **Migration vers PostgreSQL** : Modifiez `DATABASE_URL` et installez `psycopg2-binary`

## 🧪 Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## 📊 API Endpoints

### Stock
- `GET /api/stock` - Liste des articles
- `POST /api/stock` - Créer un article
- `GET /api/stock/{id}` - Détails d'un article
- `PUT /api/stock/{id}` - Modifier un article
- `DELETE /api/stock/{id}` - Supprimer un article

### Mouvements
- `GET /api/movements` - Liste des mouvements
- `POST /api/movements` - Créer un mouvement
- `GET /api/movements/stock/{stock_id}` - Mouvements d'un article

### Finance
- `GET /api/finance` - Historique des ventes
- `GET /api/finance/revenue` - Revenus totaux
- `GET /api/finance/trends` - Tendances mensuelles

### Rapports
- `GET /api/reports/dashboard` - Données du dashboard
- `GET /api/reports/stock-summary` - Résumé du stock
- `GET /api/reports/financial-summary` - Résumé financier

## 🚀 Déploiement

### Local (développement)
- Utilisez les commandes de lancement ci-dessus
- Base de données SQLite locale

### Production
1. **Base de données** : Migrez vers PostgreSQL ou MySQL
2. **Backend** : Déployez avec Gunicorn + Uvicorn
3. **Frontend** : Build de production avec `npm run build`
4. **Serveur web** : Nginx ou Apache pour servir le frontend

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Issues** : Utilisez la section Issues de GitHub
- **Documentation API** : http://localhost:8000/docs (quand le backend est lancé)
- **Questions** : Créez une discussion dans GitHub Discussions

## 🔮 Roadmap

- [ ] Authentification et autorisation
- [ ] Gestion des fournisseurs
- [ ] Notifications en temps réel
- [ ] Export des données (Excel, PDF)
- [ ] Mode sombre
- [ ] Application mobile (React Native)
- [ ] Intégration avec des systèmes de paiement
- [ ] Gestion des devises multiples

---

**Développé avec ❤️ par HikIrfane pour ELLES 224**


