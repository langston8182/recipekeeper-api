import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Recipe from '../../src/models/Recipe.js';
import recipeService from '../../src/services/recipeService.js';
import recipeController from '../../src/controllers/recipeController.js';

/**
 * Vrais tests d'intégration avec MongoDB en mémoire
 * Teste le flow complet : Controller -> Service -> Model -> MongoDB
 * Sans mocks, avec une vraie base de données
 */
describe('Integration Tests - Recipe API with Real MongoDB', () => {
    let mongoServer;

    // Démarrer MongoDB en mémoire avant tous les tests
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
    }, 30000); // Timeout de 30 secondes pour beforeAll

    // Nettoyer la base après chaque test
    afterEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    });

    // Arrêter MongoDB après tous les tests
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    }, 30000); // Timeout de 30 secondes pour afterAll

    describe('Create Recipe - Full Integration', () => {
        it('should create and save a recipe to database', async () => {
            const recipeData = {
                title: 'Spaghetti Carbonara',
                servings: 4,
                ingredients: [
                    { name: 'Spaghetti', quantity: 400, unit: 'g' },
                    { name: 'Oeufs', quantity: 4, unit: 'pièces' },
                    { name: 'Guanciale', quantity: 150, unit: 'g' }
                ],
                steps: [
                    { order: 1, text: 'Faire cuire les pâtes dans une grande casserole d\'eau bouillante salée' },
                    { order: 2, text: 'Couper le guanciale en petits dés et le faire revenir' },
                    { order: 3, text: 'Battre les oeufs avec le parmesan râpé' }
                ],
                tags: ['italien', 'PÂTES', 'Rapide']
            };

            const event = {
                body: JSON.stringify(recipeData)
            };

            const response = await recipeController.createRecipe(event);

            // Vérifier la réponse HTTP
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Recette créée avec succès');
            expect(body.data.title).toBe('Spaghetti Carbonara');
            expect(body.data.id).toBeDefined();

            // Vérifier que les tags ont été normalisés
            expect(body.data.tags).toEqual(['italien', 'pâtes', 'rapide']);

            // Vérifier que la recette existe vraiment dans la base
            const savedRecipe = await Recipe.findById(body.data.id);
            expect(savedRecipe).toBeTruthy();
            expect(savedRecipe.title).toBe('Spaghetti Carbonara');
            expect(savedRecipe.servings).toBe(4);
            expect(savedRecipe.ingredients).toHaveLength(3);
            expect(savedRecipe.steps).toHaveLength(3);
            expect(savedRecipe.tags).toEqual(['italien', 'pâtes', 'rapide']);
        });

        it('should reject recipe without required fields', async () => {
            const incompleteData = {
                servings: 4,
                ingredients: [],
                steps: []
            };

            const event = {
                body: JSON.stringify(incompleteData)
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toContain('Validation échouée');
            expect(body.error).toContain('titre');

            // Vérifier qu'aucune recette n'a été créée
            const count = await Recipe.countDocuments();
            expect(count).toBe(0);
        });

        it('should reject recipe with empty ingredients', async () => {
            const recipeData = {
                title: 'Bad Recipe',
                servings: 4,
                ingredients: [],
                steps: [{ order: 1, text: 'Step 1' }],
                tags: []
            };

            const event = {
                body: JSON.stringify(recipeData)
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toContain('Validation échouée');
            expect(body.error).toContain('ingrédient');

            // Vérifier qu'aucune recette n'a été créée
            const count = await Recipe.countDocuments();
            expect(count).toBe(0);
        });

        it('should normalize tags and sort steps', async () => {
            const recipeData = {
                title: 'Test Recipe',
                servings: 2,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [
                    { order: 3, text: 'Step 3' },
                    { order: 1, text: 'Step 1' },
                    { order: 2, text: 'Step 2' }
                ],
                tags: ['Tag1', 'TAG2', 'tag1', ' Tag3 ']
            };

            const event = {
                body: JSON.stringify(recipeData)
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            // Tags normalisés et dédupliqués
            expect(body.data.tags).toEqual(['tag1', 'tag2', 'tag3']);

            // Vérifier dans la base
            const savedRecipe = await Recipe.findById(body.data.id);
            expect(savedRecipe.steps[0].order).toBe(1);
            expect(savedRecipe.steps[1].order).toBe(2);
            expect(savedRecipe.steps[2].order).toBe(3);
        });
    });

    describe('Get Recipe - Full Integration', () => {
        it('should retrieve a recipe by ID from database', async () => {
            // Créer une recette directement dans la base
            const recipe = new Recipe({
                title: 'Tarte aux Pommes',
                servings: 6,
                ingredients: [
                    { name: 'Pommes', quantity: 1000, unit: 'g' },
                    { name: 'Pâte brisée', quantity: 1, unit: 'pièce' }
                ],
                steps: [
                    { order: 1, text: 'Éplucher les pommes' },
                    { order: 2, text: 'Disposer sur la pâte' }
                ],
                tags: ['dessert', 'français']
            });
            await recipe.save();

            // Récupérer via le controller
            const event = {
                pathParameters: {
                    id: recipe._id.toString()
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.title).toBe('Tarte aux Pommes');
            expect(body.data.servings).toBe(6);
            expect(body.data.id).toBe(recipe._id.toString());
        });

        it('should return 400 when recipe does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            
            const event = {
                pathParameters: {
                    id: fakeId.toString()
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Recette non trouvée');
        });

        it('should return 400 for invalid ObjectId', async () => {
            const event = {
                pathParameters: {
                    id: 'invalid-id-format'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Recette non trouvée');
        });
    });

    describe('Get All Recipes - Full Integration', () => {
        beforeEach(async () => {
            // Créer plusieurs recettes pour tester
            const recipes = [
                {
                    title: 'Pizza Margherita',
                    servings: 4,
                    ingredients: [{ name: 'Pâte à pizza', quantity: 1, unit: 'pièce' }],
                    steps: [{ order: 1, text: 'Étaler la pâte' }],
                    tags: ['italien', 'rapide']
                },
                {
                    title: 'Risotto aux champignons',
                    servings: 4,
                    ingredients: [{ name: 'Riz', quantity: 300, unit: 'g' }],
                    steps: [{ order: 1, text: 'Cuire le riz' }],
                    tags: ['italien', 'végétarien']
                },
                {
                    title: 'Salade César',
                    servings: 2,
                    ingredients: [{ name: 'Laitue', quantity: 1, unit: 'pièce' }],
                    steps: [{ order: 1, text: 'Laver la salade' }],
                    tags: ['salade', 'rapide']
                }
            ];

            for (const data of recipes) {
                const recipe = new Recipe(data);
                await recipe.save();
            }
        });

        it('should retrieve all recipes from database', async () => {
            const event = {
                queryStringParameters: null
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(3);
            expect(body.data).toHaveLength(3);
        });

        it('should filter recipes by tags', async () => {
            const event = {
                queryStringParameters: {
                    tags: 'italien'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(2);
            expect(body.data.every(r => r.tags.includes('italien'))).toBe(true);
        });

        it('should filter by multiple tags', async () => {
            const event = {
                queryStringParameters: {
                    tags: 'italien,rapide'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(1);
            expect(body.data[0].title).toBe('Pizza Margherita');
        });

        it('should paginate results', async () => {
            const event = {
                queryStringParameters: {
                    limit: '2',
                    skip: '0'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(2);
            expect(body.data).toHaveLength(2);
        });

        it('should sort recipes', async () => {
            const event = {
                queryStringParameters: {
                    sortBy: 'title',
                    sortOrder: 'asc'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data[0].title).toBe('Pizza Margherita');
            expect(body.data[1].title).toBe('Risotto aux champignons');
            expect(body.data[2].title).toBe('Salade César');
        });

        it('should return empty array when no recipes match filter', async () => {
            const event = {
                queryStringParameters: {
                    tags: 'inexistant'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(0);
            expect(body.data).toEqual([]);
        });
    });

    describe('Complete Recipe Workflow', () => {
        it('should create, retrieve, and list recipes', async () => {
            // 1. Créer une recette
            const createEvent = {
                body: JSON.stringify({
                    title: 'Quiche Lorraine',
                    servings: 6,
                    ingredients: [
                        { name: 'Pâte brisée', quantity: 1, unit: 'pièce' },
                        { name: 'Lardons', quantity: 200, unit: 'g' }
                    ],
                    steps: [
                        { order: 1, text: 'Préchauffer le four' },
                        { order: 2, text: 'Disposer les lardons' }
                    ],
                    tags: ['français', 'salé']
                })
            };

            const createResponse = await recipeController.createRecipe(createEvent);
            expect(createResponse.statusCode).toBe(200);
            const createdRecipe = JSON.parse(createResponse.body).data;

            // 2. Récupérer la recette par ID
            const getEvent = {
                pathParameters: {
                    id: createdRecipe.id
                }
            };

            const getResponse = await recipeController.getRecipe(getEvent);
            expect(getResponse.statusCode).toBe(200);
            const retrievedRecipe = JSON.parse(getResponse.body).data;
            expect(retrievedRecipe.title).toBe('Quiche Lorraine');

            // 3. Lister toutes les recettes
            const listEvent = {
                queryStringParameters: null
            };

            const listResponse = await recipeController.getAllRecipes(listEvent);
            expect(listResponse.statusCode).toBe(200);
            const allRecipes = JSON.parse(listResponse.body);
            expect(allRecipes.count).toBe(1);
            expect(allRecipes.data[0].title).toBe('Quiche Lorraine');

            // 4. Vérifier dans la base de données
            const dbCount = await Recipe.countDocuments();
            expect(dbCount).toBe(1);
        });
    });
});
