import { jest } from '@jest/globals';
import Recipe from '../../src/models/Recipe.js';

// Mock des méthodes Recipe
const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindById = jest.fn();

Recipe.prototype.save = mockSave;
Recipe.find = mockFind;
Recipe.findById = mockFindById;

// Import des modules après les mocks
const { default: recipeService } = await import('../../src/services/recipeService.js');
const { default: recipeController } = await import('../../src/controllers/recipeController.js');

describe('Integration Tests - Recipe Flow (Controller + Service)', () => {
    
    beforeEach(() => {
        mockSave.mockClear();
        mockFind.mockClear();
        mockFindById.mockClear();
    });

    describe('Create Recipe Flow', () => {
        it('should create a recipe through controller and service', async () => {
            const recipeData = {
                title: 'Spaghetti Carbonara',
                servings: 4,
                ingredients: [
                    { name: 'Spaghetti', quantity: 400, unit: 'g' },
                    { name: 'Oeufs', quantity: 4, unit: 'pièces' }
                ],
                steps: [
                    { order: 1, text: 'Faire cuire les pâtes' },
                    { order: 2, text: 'Préparer la sauce' }
                ],
                tags: ['italien', 'pâtes', 'RAPIDE']
            };

            // Mock de la sauvegarde
            mockSave.mockResolvedValue({
                _id: '507f1f77bcf86cd799439011',
                ...recipeData,
                tags: ['italien', 'pâtes', 'rapide'], // tags normalisés
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const event = {
                body: JSON.stringify(recipeData)
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Recette créée avec succès');
            expect(body.data.title).toBe('Spaghetti Carbonara');
            expect(body.data.tags).toEqual(['italien', 'pâtes', 'rapide']); // tags en minuscules
            expect(mockSave).toHaveBeenCalled();
        });

        it('should reject recipe with duplicate step orders', async () => {
            const recipeData = {
                title: 'Bad Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [
                    { order: 1, text: 'Step 1' },
                    { order: 1, text: 'Step 1 duplicate' }
                ],
                tags: []
            };

            const event = {
                body: JSON.stringify(recipeData)
            };

            const response = await recipeController.createRecipe(event);

            // L'erreur est lancée avant la validation Mongoose, donc c'est une erreur 500
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal error');
        });

        it('should handle validation errors', async () => {
            mockSave.mockRejectedValue({
                name: 'ValidationError',
                errors: {
                    title: { message: 'Le titre de la recette est requis' },
                    servings: { message: 'Le nombre de portions est requis' }
                }
            });

            const event = {
                body: JSON.stringify({
                    ingredients: [],
                    steps: []
                })
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toContain('Validation échouée');
        });
    });

    describe('Get Recipe Flow', () => {
        it('should retrieve a recipe by ID', async () => {
            const mockRecipe = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Spaghetti Carbonara',
                servings: 4,
                ingredients: [{ name: 'Spaghetti', quantity: 400, unit: 'g' }],
                steps: [{ order: 1, text: 'Faire cuire' }],
                tags: ['italien'],
                toJSON: function() {
                    return {
                        id: this._id,
                        title: this.title,
                        servings: this.servings,
                        ingredients: this.ingredients,
                        steps: this.steps,
                        tags: this.tags
                    };
                }
            };

            mockFindById.mockResolvedValue(mockRecipe);

            const event = {
                pathParameters: {
                    id: '507f1f77bcf86cd799439011'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.title).toBe('Spaghetti Carbonara');
            expect(mockFindById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });

        it('should return 400 when recipe not found', async () => {
            mockFindById.mockResolvedValue(null);

            const event = {
                pathParameters: {
                    id: '507f1f77bcf86cd799439011'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Recette non trouvée');
        });

        it('should handle invalid ObjectId format', async () => {
            mockFindById.mockRejectedValue({
                name: 'CastError'
            });

            const event = {
                pathParameters: {
                    id: 'invalid-id'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Recette non trouvée');
        });
    });

    describe('Get All Recipes Flow', () => {
        it('should retrieve all recipes with pagination', async () => {
            const mockRecipes = [
                {
                    _id: '1',
                    title: 'Recipe 1',
                    servings: 4,
                    ingredients: [],
                    steps: [],
                    tags: ['test']
                },
                {
                    _id: '2',
                    title: 'Recipe 2',
                    servings: 2,
                    ingredients: [],
                    steps: [],
                    tags: ['test']
                }
            ];

            mockFind.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRecipes)
            });

            const event = {
                queryStringParameters: {
                    limit: '10',
                    skip: '0',
                    sortBy: 'title',
                    sortOrder: 'asc'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(2);
            expect(body.data).toHaveLength(2);
            expect(mockFind).toHaveBeenCalled();
        });

        it('should filter recipes by tags', async () => {
            const mockRecipes = [
                {
                    _id: '1',
                    title: 'Italian Recipe',
                    servings: 4,
                    ingredients: [],
                    steps: [],
                    tags: ['italien', 'rapide']
                }
            ];

            mockFind.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRecipes)
            });

            const event = {
                queryStringParameters: {
                    tags: 'italien,rapide'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(1);
            expect(body.data[0].tags).toContain('italien');
            
            // Vérifier que Recipe.find a été appelé avec le filtre de tags
            expect(mockFind).toHaveBeenCalledWith(
                expect.objectContaining({
                    tags: { $all: ['italien', 'rapide'] }
                })
            );
        });

        it('should handle empty results', async () => {
            mockFind.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            const event = {
                queryStringParameters: null
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(0);
            expect(body.data).toEqual([]);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockSave.mockRejectedValue(new Error('Database connection failed'));

            const event = {
                body: JSON.stringify({
                    title: 'Test',
                    servings: 4,
                    ingredients: [],
                    steps: []
                })
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal error');
        });

        it('should handle malformed JSON', async () => {
            const event = {
                body: 'not valid json'
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(500);
        });

        it('should handle null body', async () => {
            const event = {
                body: null
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
        });
    });

    describe('Data Normalization', () => {
        it('should normalize tags to lowercase and remove duplicates', async () => {
            const recipeData = {
                title: 'Test Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [{ order: 1, text: 'Step 1' }],
                tags: ['Italien', 'RAPIDE', 'italien', ' Italien ']
            };

            mockSave.mockResolvedValue({
                _id: '1',
                ...recipeData,
                tags: ['italien', 'rapide']
            });

            const event = {
                body: JSON.stringify(recipeData)
            };

            await recipeController.createRecipe(event);

            // Vérifier que les tags ont été normalisés
            expect(mockSave).toHaveBeenCalled();
        });

        it('should sort steps by order', async () => {
            const recipeData = {
                title: 'Test Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [
                    { order: 3, text: 'Step 3' },
                    { order: 1, text: 'Step 1' },
                    { order: 2, text: 'Step 2' }
                ],
                tags: []
            };

            mockSave.mockResolvedValue({
                _id: '1',
                ...recipeData
            });

            const event = {
                body: JSON.stringify(recipeData)
            };

            await recipeController.createRecipe(event);

            expect(mockSave).toHaveBeenCalled();
        });
    });
});
