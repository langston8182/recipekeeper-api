import {getDb} from "./utils/db.mjs";
import recipeController from './controllers/recipeController.js';
import Router from './utils/router.js';

// Initialiser le router
const router = new Router();

// Définir les routes
router.addRoute('POST', '/recipes', (event) => recipeController.createRecipe(event));
router.addRoute('GET', '/recipes/{id}', (event) => recipeController.getRecipe(event));
router.addRoute('GET', '/recipes', (event) => recipeController.getAllRecipes(event));

/**
 * Point d'entrée principal de la Lambda
 * Gère la connexion MongoDB et le routing
 */
export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Connexion à MongoDB (réutilise la connexion existante si disponible)
        await getDb();

        // Router la requête vers le bon controller
        return await router.route(event);

    } catch (error) {
        console.error('Erreur globale dans le handler:', error);


        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Erreur interne du serveur',
                message: error.message
            })
        };
    }
};
