/**
 * Utilitaire pour gérer le routing des requêtes
 */
class Router {
    constructor() {
        this.routes = [];
    }

    /**
     * Ajouter une route
     */
    addRoute(method, path, handler) {
        this.routes.push({ method, path, handler });
    }

    /**
     * Trouver et exécuter le handler correspondant
     */
    async route(event) {
        const method = event.requestContext?.http?.method || event.httpMethod;
        const path = event.requestContext?.http?.path || event.path;

        console.log(`Routing: ${method} ${path}`);

        // Chercher une route exacte
        for (const route of this.routes) {
            if (route.method === method) {
                // Route exacte
                if (route.path === path) {
                    return await route.handler(event);
                }

                // Route avec paramètre (ex: /recipes/{id})
                const routePattern = route.path.replace(/{[^}]+}/g, '([^/]+)');
                const regex = new RegExp(`^${routePattern}$`);

                if (regex.test(path)) {
                    // Extraction des paramètres
                    const match = path.match(regex);
                    if (match) {
                        event.pathParameters = event.pathParameters || {};
                        const paramNames = route.path.match(/{([^}]+)}/g);
                        if (paramNames) {
                            paramNames.forEach((param, index) => {
                                const paramName = param.slice(1, -1); // Retirer les accolades
                                event.pathParameters[paramName] = match[index + 1];
                            });
                        }
                    }
                    return await route.handler(event);
                }
            }
        }

        // Aucune route trouvée
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Route non trouvée'
            })
        };
    }
}

export default Router;
