import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

/** Mount Swagger UI at /api-docs and raw JSON at /api-docs.json */
export function setupSwagger(app) {
    app.get('/api-docs.json', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json(openApiSpec);
    });

    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(openApiSpec, {
            customSiteTitle: 'UTSAVX API Docs',
            customCss: '.swagger-ui .topbar { display: none }',
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: 'none',
                filter: true,
                tryItOutEnabled: true
            }
        })
    );
}
