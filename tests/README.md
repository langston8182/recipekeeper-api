# RecipeKeeper API - Tests

## Events AWS Lambda

Les fichiers d'events dans `tests/events/` peuvent être utilisés pour tester la Lambda localement ou dans la console AWS Lambda.

### Exemples d'utilisation

#### Créer une recette
```bash
sam local invoke -e tests/events/create-recipe.json
```

#### Récupérer une recette par ID
```bash
sam local invoke -e tests/events/get-recipe.json
```

#### Récupérer toutes les recettes
```bash
sam local invoke -e tests/events/get-all-recipes.json
```

#### Récupérer des recettes avec filtres
```bash
sam local invoke -e tests/events/get-all-recipes-with-params.json
```

## Tests unitaires

Les tests unitaires testent chaque composant de manière isolée en mockant les dépendances.

```bash
npm run test:unit
```

### Couverture
- `recipeController.test.js` - Controller HTTP
- `recipeService.test.js` - Service métier
- `router.test.js` - Router des requêtes

## Tests d'intégration

Les tests d'intégration testent le flux complet depuis le handler jusqu'au service.

```bash
npm run test:integration
```

### Couverture
- `handler.test.js` - Point d'entrée Lambda complet

## Lancer tous les tests

```bash
npm test
```

## Coverage

Pour générer un rapport de couverture de code :

```bash
npm run test:coverage
```

## Mode watch

Pour lancer les tests en mode watch (utile pendant le développement) :

```bash
npm run test:watch
```

## Structure des tests

```
tests/
├── events/              # Events AWS Lambda pour tests manuels
│   ├── create-recipe.json
│   ├── get-recipe.json
│   ├── get-all-recipes.json
│   └── get-all-recipes-with-params.json
├── integration/         # Tests d'intégration
│   └── handler.test.js
└── unit/               # Tests unitaires
    ├── recipeController.test.js
    ├── recipeService.test.js
    └── router.test.js
```
