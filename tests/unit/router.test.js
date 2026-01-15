import { jest } from '@jest/globals';
import Router from '../../src/utils/router.js';

describe('Unit Tests - Router', () => {
    let router;

    beforeEach(() => {
        router = new Router();
    });

    describe('addRoute', () => {
        it('should add a route', () => {
            const handler = jest.fn();
            router.addRoute('GET', '/test', handler);

            expect(router.routes).toHaveLength(1);
            expect(router.routes[0]).toEqual({
                method: 'GET',
                path: '/test',
                handler
            });
        });

        it('should add multiple routes', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            router.addRoute('GET', '/test1', handler1);
            router.addRoute('POST', '/test2', handler2);

            expect(router.routes).toHaveLength(2);
        });
    });

    describe('route - exact matches', () => {
        it('should route to exact path match', async () => {
            const handler = jest.fn().mockResolvedValue({ statusCode: 200 });
            router.addRoute('GET', '/recipes', handler);

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/recipes'
                    }
                }
            };

            const result = await router.route(event);

            expect(handler).toHaveBeenCalledWith(event);
            expect(result).toEqual({ statusCode: 200 });
        });

        it('should match correct HTTP method', async () => {
            const getHandler = jest.fn().mockResolvedValue({ statusCode: 200 });
            const postHandler = jest.fn().mockResolvedValue({ statusCode: 201 });

            router.addRoute('GET', '/recipes', getHandler);
            router.addRoute('POST', '/recipes', postHandler);

            const event = {
                requestContext: {
                    http: {
                        method: 'POST',
                        path: '/recipes'
                    }
                }
            };

            await router.route(event);

            expect(postHandler).toHaveBeenCalled();
            expect(getHandler).not.toHaveBeenCalled();
        });
    });

    describe('route - path parameters', () => {
        it('should extract path parameters', async () => {
            const handler = jest.fn().mockResolvedValue({ statusCode: 200 });
            router.addRoute('GET', '/recipes/{id}', handler);

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/recipes/123'
                    }
                }
            };

            await router.route(event);

            expect(handler).toHaveBeenCalled();
            expect(event.pathParameters).toEqual({ id: '123' });
        });

        it('should handle multiple path parameters', async () => {
            const handler = jest.fn().mockResolvedValue({ statusCode: 200 });
            router.addRoute('GET', '/users/{userId}/recipes/{recipeId}', handler);

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/users/456/recipes/789'
                    }
                }
            };

            await router.route(event);

            expect(event.pathParameters).toEqual({
                userId: '456',
                recipeId: '789'
            });
        });

        it('should preserve existing pathParameters', async () => {
            const handler = jest.fn().mockResolvedValue({ statusCode: 200 });
            router.addRoute('GET', '/recipes/{id}', handler);

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/recipes/123'
                    }
                },
                pathParameters: {
                    existingParam: 'value'
                }
            };

            await router.route(event);

            expect(event.pathParameters).toEqual({
                existingParam: 'value',
                id: '123'
            });
        });
    });

    describe('route - legacy format support', () => {
        it('should support legacy httpMethod and path format', async () => {
            const handler = jest.fn().mockResolvedValue({ statusCode: 200 });
            router.addRoute('GET', '/recipes', handler);

            const event = {
                httpMethod: 'GET',
                path: '/recipes'
            };

            const result = await router.route(event);

            expect(handler).toHaveBeenCalled();
            expect(result).toEqual({ statusCode: 200 });
        });
    });

    describe('route - not found', () => {
        it('should return 404 when no route matches', async () => {
            router.addRoute('GET', '/recipes', jest.fn());

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/unknown'
                    }
                }
            };

            const result = await router.route(event);

            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).error).toBe('Route non trouvée');
        });

        it('should return 404 when method does not match', async () => {
            router.addRoute('GET', '/recipes', jest.fn());

            const event = {
                requestContext: {
                    http: {
                        method: 'DELETE',
                        path: '/recipes'
                    }
                }
            };

            const result = await router.route(event);

            expect(result.statusCode).toBe(404);
        });
    });

    describe('route - error handling', () => {
        it('should propagate handler errors', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
            router.addRoute('GET', '/recipes', handler);

            const event = {
                requestContext: {
                    http: {
                        method: 'GET',
                        path: '/recipes'
                    }
                }
            };

            await expect(router.route(event)).rejects.toThrow('Handler error');
        });
    });
});
