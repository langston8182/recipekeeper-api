import { jest } from '@jest/globals';
import recipeService from '../../src/services/recipeService.js';

// Mock des méthodes du service
const mockAddRecipe = jest.fn();
const mockGetRecipeById = jest.fn();
const mockGetAllRecipes = jest.fn();

recipeService.addRecipe = mockAddRecipe;
recipeService.getRecipeById = mockGetRecipeById;
recipeService.getAllRecipes = mockGetAllRecipes;

// Import du controller après le mock
const { default: recipeController } = await import('../../src/controllers/recipeController.js');

describe('Unit Tests - RecipeController', () => {
    
    beforeEach(() => {
        mockAddRecipe.mockClear();
        mockGetRecipeById.mockClear();
        mockGetAllRecipes.mockClear();
    });

    describe('createRecipe', () => {
        it('should create a recipe and return 200', async () => {
            const mockRecipe = {
                id: '507f1f77bcf86cd799439011',
                title: 'Test Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [{ order: 1, text: 'Step 1' }],
                tags: ['test']
            };

            mockAddRecipe.mockResolvedValue(mockRecipe);

            const event = {
                body: JSON.stringify({
                    title: 'Test Recipe',
                    servings: 4,
                    ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                    steps: [{ order: 1, text: 'Step 1' }],
                    tags: ['test']
                })
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(200);
            expect(response.headers['Content-Type']).toBe('application/json');
            
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Recette créée avec succès');
            expect(body.data).toEqual(mockRecipe);
            expect(mockAddRecipe).toHaveBeenCalledTimes(1);
        });

        it('should return 400 when body is invalid', async () => {
            const event = {
                body: 'invalid json'
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal error');
        });

        it('should return 400 when body is null', async () => {
            const event = {
                body: null
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 when validation fails', async () => {
            mockAddRecipe.mockRejectedValue(
                new Error('Validation échouée: Le titre est requis')
            );

            const event = {
                body: JSON.stringify({ servings: 4 })
            };

            const response = await recipeController.createRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toContain('Validation échouée');
        });

        it('should return 500 on unexpected error', async () => {
            mockAddRecipe.mockRejectedValue(
                new Error('Database error')
            );

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
    });

    describe('getRecipe', () => {
        it('should return a recipe by id', async () => {
            const mockRecipe = {
                id: '507f1f77bcf86cd799439011',
                title: 'Test Recipe',
                servings: 4
            };

            mockGetRecipeById.mockResolvedValue(mockRecipe);

            const event = {
                pathParameters: {
                    id: '507f1f77bcf86cd799439011'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data).toEqual(mockRecipe);
            expect(mockGetRecipeById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });

        it('should return 400 when id is missing', async () => {
            const event = {
                pathParameters: null
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ID de la recette manquant');
        });

        it('should return 400 when recipe not found', async () => {
            mockGetRecipeById.mockResolvedValue(null);

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

        it('should return 500 on service error', async () => {
            mockGetRecipeById.mockRejectedValue(
                new Error('Database error')
            );

            const event = {
                pathParameters: {
                    id: '507f1f77bcf86cd799439011'
                }
            };

            const response = await recipeController.getRecipe(event);

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal error');
        });
    });

    describe('getAllRecipes', () => {
        it('should return all recipes with default options', async () => {
            const mockRecipes = [
                { id: '1', title: 'Recipe 1', servings: 4 },
                { id: '2', title: 'Recipe 2', servings: 2 }
            ];

            mockGetAllRecipes.mockResolvedValue(mockRecipes);

            const event = {
                queryStringParameters: null
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(2);
            expect(body.data).toEqual(mockRecipes);
            expect(mockGetAllRecipes).toHaveBeenCalledWith({
                limit: 50,
                skip: 0,
                sortBy: 'createdAt',
                sortOrder: 'desc',
                tags: null
            });
        });

        it('should apply query parameters', async () => {
            const mockRecipes = [{ id: '1', title: 'Recipe 1', servings: 4 }];

            mockGetAllRecipes.mockResolvedValue(mockRecipes);

            const event = {
                queryStringParameters: {
                    limit: '10',
                    skip: '5',
                    sortBy: 'title',
                    sortOrder: 'asc',
                    tags: 'italien,rapide'
                }
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            expect(mockGetAllRecipes).toHaveBeenCalledWith({
                limit: 10,
                skip: 5,
                sortBy: 'title',
                sortOrder: 'asc',
                tags: ['italien', 'rapide']
            });
        });

        it('should handle empty query parameters', async () => {
            const mockRecipes = [];

            mockGetAllRecipes.mockResolvedValue(mockRecipes);

            const event = {
                queryStringParameters: {}
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.count).toBe(0);
            expect(body.data).toEqual([]);
        });

        it('should return 500 on service error', async () => {
            mockGetAllRecipes.mockRejectedValue(
                new Error('Database error')
            );

            const event = {
                queryStringParameters: null
            };

            const response = await recipeController.getAllRecipes(event);

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal error');
        });
    });
});
