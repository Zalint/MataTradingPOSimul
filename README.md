# Mata Trading Simulator

Un simulateur interactif d'analyse de rentabilité pour le trading de viande, développé en React avec des graphiques avancés.

## Fonctionnalités

- **Paramètres globaux** : Volume, abats par kg, pération
- **Actions rapides** : Augmentation/diminution des prix en un clic
- **Graphiques interactifs** : Bénéfices, répartition, marges
- **Simulations stratégiques** : Comparaison Bœuf/Veau
- **Tableaux détaillés** : Calculs en temps réel
- **Validation des répartitions** : Contrôle automatique à 100%

## Installation

```bash
npm install
npm start
```

## Technologies utilisées

- React 18
- Recharts (graphiques)
- Tailwind CSS (styling)
- JavaScript ES6+

## Structure du projet

```
src/
├── components/
│   └── SimulateurRentabilite.js  # Composant principal
├── App.js                        # Point d'entrée
├── index.js                      # Rendu React
└── index.css                     # Styles Tailwind
```

## Formules de calcul

- **Standard** : Marge = (Prix vente / Prix achat) - 1
- **Bœuf/Veau** : Marge = ((Prix vente + Abats) × (1 - Pération)) / Prix achat - 1
- **Bénéfice** : Marge × Répartition × Volume 