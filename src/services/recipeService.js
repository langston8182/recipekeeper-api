import Recipe from '../models/Recipe.js';

/**
 * Service pour gérer toute la logique métier liée aux recettes
 * Ce service est indépendant de la couche HTTP et peut être testé unitairement
 */
class RecipeService {

    /**
     * Ajouter une nouvelle recette
     * @param {Object} recipeData - Les données de la recette
     * @returns {Promise<Object>} La recette créée
     */
    async addRecipe(recipeData) {
        try {
            // Validation métier supplémentaire si nécessaire
            this._validateRecipeData(recipeData);

            // Tri des étapes par ordre
            if (recipeData.steps && recipeData.steps.length > 0) {
                recipeData.steps.sort((a, b) => a.order - b.order);
            }

            // Normalisation des tags (minuscules, sans doublons)
            if (recipeData.tags && recipeData.tags.length > 0) {
                recipeData.tags = [...new Set(recipeData.tags.map(tag => tag.toLowerCase().trim()))];
            }

            const recipe = new Recipe(recipeData);
            await recipe.save();

            return recipe.toJSON();
        } catch (error) {
            if (error.name === 'ValidationError') {
                throw new Error(`Validation échouée: ${this._formatValidationErrors(error)}`);
            }
            throw error;
        }
    }

    /**
     * Récupérer une recette par son ID
     * @param {String} recipeId - L'ID de la recette
     * @returns {Promise<Object|null>} La recette trouvée ou null
     */
    async getRecipeById(recipeId) {
        try {
            const recipe = await Recipe.findById(recipeId);

            if (!recipe) {
                return null;
            }

            return recipe.toJSON();
        } catch (error) {
            // Si l'ID n'est pas valide (format ObjectId incorrect)
            if (error.name === 'CastError') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Récupérer toutes les recettes
     * @param {Object} options - Options de pagination et filtrage
     * @returns {Promise<Array>} Liste des recettes
     */
    async getAllRecipes(options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                tags = null
            } = options;

            // Construction du filtre
            const filter = {};
            if (tags && tags.length > 0) {
                // Utiliser $all pour un filtre AND (la recette doit avoir tous les tags)
                filter.tags = { $all: tags };
            }

            // Construction de la requête
             // Utilisation de lean() pour de meilleures performances
            return await Recipe.find(filter)
                .sort({[sortBy]: sortOrder === 'desc' ? -1 : 1})
                .limit(limit)
                .skip(skip)
                .lean();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Validation métier personnalisée
     * @private
     */
    _validateRecipeData(recipeData) {
        // Vérification que les ordres des étapes sont uniques et consécutifs
        if (recipeData.steps && recipeData.steps.length > 0) {
            const orders = recipeData.steps.map(step => step.order);
            const uniqueOrders = new Set(orders);

            if (uniqueOrders.size !== orders.length) {
                throw new Error('Les numéros d\'ordre des étapes doivent être uniques');
            }
        }
    }

    /**
     * Formater les erreurs de validation Mongoose
     * @private
     */
    _formatValidationErrors(error) {
        const errors = Object.values(error.errors).map(err => err.message);
        return errors.join(', ');
    }
}

export default new RecipeService();
