import { jest } from '@jest/globals';
import Recipe from '../../src/models/Recipe.js';

// Mock des méthodes du modèle
const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindById = jest.fn();

Recipe.prototype.save = mockSave;
Recipe.find = mockFind;
Recipe.findById = mockFindById;

// Import du service après le mock
const { default: recipeService } = await import('../../src/services/recipeService.js');

describe('Unit Tests - RecipeService', () => {
    
    beforeEach(() => {
        mockSave.mockClear();
        mockFind.mockClear();
        mockFindById.mockClear();
    });

    describe('addRecipe', () => {
        it('should add a new recipe successfully', async () => {
            const recipeData = {
                title: 'Test Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [{ order: 1, text: 'Step 1' }],
                tags: ['Test', 'RECIPE']
            };

            mockSave.mockResolvedValue({
                _id: '507f1f77bcf86cd799439011',
                ...recipeData,
                tags: ['test', 'recipe']
            });

            const result = await recipeService.addRecipe(recipeData);

            expect(mockSave).toHaveBeenCalled();
            expect(result.title).toBe('Test Recipe');
        });

        it('should throw error when steps have duplicate orders', async () => {
            const recipeData = {
                title: 'Test Recipe',
                servings: 4,
                ingredients: [{ name: 'Test', quantity: 100, unit: 'g' }],
                steps: [
                    { order: 1, text: 'Step 1' },
                    { order: 1, text: 'Step 1 duplicate' }
                ],
                tags: []
            };

            await expect(recipeService.addRecipe(recipeData)).rejects.toThrow(
                'Les numéros d\'ordre des étapes doivent être uniques'
            );
        });

        it('should handle validation errors', async () => {
            const recipeData = {
                servings: 4,
                ingredients: [],
                steps: []
            };

            mockSave.mockRejectedValue({
                name: 'ValidationError',
                errors: {
                    title: { message: 'Le titre de la recette est requis' }
                }
            });

            await expect(recipeService.addRecipe(recipeData)).rejects.toThrow(
                'Validation échouée'
            );
        });
    });

    describe('getRecipeById', () => {
        it('should return a recipe by id', async () => {
            const mockRecipe = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Test Recipe',
                toJSON: () => ({
                    id: '507f1f77bcf86cd799439011',
                    title: 'Test Recipe'
                })
            };

            mockFindById.mockResolvedValue(mockRecipe);

            const result = await recipeService.getRecipeById('507f1f77bcf86cd799439011');

            expect(result.title).toBe('Test Recipe');
            expect(mockFindById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });

        it('should return null when recipe not found', async () => {
            mockFindById.mockResolvedValue(null);

            const result = await recipeService.getRecipeById('507f1f77bcf86cd799439011');

            expect(result).toBeNull();
        });

        it('should return null on invalid ObjectId format', async () => {
            mockFindById.mockRejectedValue({
                name: 'CastError'
            });

            const result = await recipeService.getRecipeById('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('getAllRecipes', () => {
        it('should return all recipes with default options', async () => {
            const mockRecipes = [
                { _id: '1', title: 'Recipe 1' },
                { _id: '2', title: 'Recipe 2' }
            ];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRecipes)
            };

            mockFind.mockReturnValue(mockQuery);

            const result = await recipeService.getAllRecipes();

            expect(result).toEqual(mockRecipes);
            expect(mockFind).toHaveBeenCalledWith({});
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(mockQuery.skip).toHaveBeenCalledWith(0);
        });

        it('should apply custom options', async () => {
            const mockRecipes = [{ _id: '1', title: 'Recipe 1' }];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRecipes)
            };

            mockFind.mockReturnValue(mockQuery);

            const options = {
                limit: 10,
                skip: 5,
                sortBy: 'title',
                sortOrder: 'asc',
                tags: null
            };

            await recipeService.getAllRecipes(options);

            expect(mockQuery.sort).toHaveBeenCalledWith({ title: 1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.skip).toHaveBeenCalledWith(5);
        });

        it('should filter by tags', async () => {
            const mockRecipes = [{ _id: '1', title: 'Recipe 1' }];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockRecipes)
            };

            mockFind.mockReturnValue(mockQuery);

            const options = {
                tags: ['italien', 'rapide']
            };

            await recipeService.getAllRecipes(options);

            expect(mockFind).toHaveBeenCalledWith({
                tags: { $all: ['italien', 'rapide'] }
            });
        });
    });
});
