import recipeService from '../services/recipeService.js';
import { ok, badRequest, notFound, serverError } from "../utils/http.mjs";

/**
 * Controller pour gérer les endpoints HTTP des recettes
 * Ne contient que la gestion HTTP, toute la logique métier est dans le service
 */
class RecipeController {

    /**
     * POST /recipes - Créer une nouvelle recette
     */
    async createRecipe(event) {
        try {
            // Parsing du body
            const recipeData = JSON.parse(event.body);

            // Validation basique
            if (!recipeData || typeof recipeData !== 'object') {
                return badRequest('Le corps de la requête est invalide')
            }

            // Appel au service
            const recipe = await recipeService.addRecipe(recipeData);

            return ok({
                message: 'Recette créée avec succès',
                data: recipe
            });
        } catch (error) {
            console.error('Erreur lors de la création de la recette:', error);

            if (error.message.includes('Validation échouée')) {
                return badRequest(error.message)
            }

            return serverError('Erreur interne du serveur')
        }
    }

    /**
     * GET /recipes/{id} - Récupérer une recette par ID
     */
    async getRecipe(event) {
        try {
            const recipeId = event.pathParameters?.id;

            if (!recipeId) {
                return badRequest('ID de la recette manquant')
            }

            // Appel au service
            const recipe = await recipeService.getRecipeById(recipeId);

            if (!recipe) {
                return badRequest('Recette non trouvée')
            }

            return ok({
                data: recipe
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la recette:', error);
            return serverError('Erreur interne du serveur')
        }
    }

    /**
     * GET /recipes - Récupérer toutes les recettes
     */
    async getAllRecipes(event) {
        try {
            // Extraction des query parameters
            const queryParams = event.queryStringParameters || {};

            const options = {
                limit: parseInt(queryParams.limit) || 50,
                skip: parseInt(queryParams.skip) || 0,
                sortBy: queryParams.sortBy || 'createdAt',
                sortOrder: queryParams.sortOrder || 'desc',
                tags: queryParams.tags ? queryParams.tags.split(',') : null
            };

            // Appel au service
            const recipes = await recipeService.getAllRecipes(options);

            return ok({
                count: recipes.length,
                data: recipes
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des recettes:', error);
            return serverError('Erreur interne du serveur');
        }
    }
}

export default new RecipeController();
