import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { API_VERSIONS, DEFAULT_VERSION } from './api-version.config';
import { version } from '../../../package.json';

export const setupSwagger = (app: INestApplication) => {
    const config = new DocumentBuilder()
        .setTitle('Farmers Marketplace API')
        .setDescription('API documentation for the Farmers Marketplace platform')
        .setVersion(version)
        .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header' }, 'access-token')
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User management endpoints')
        .addTag('products', 'Product management endpoints')
        .addTag('orders', 'Order management endpoints')
        .addServer(`/api/${DEFAULT_VERSION}`)
        .addServer('/api/v1')
        .addServer('/api/v2');

    // Add version-specific servers
    API_VERSIONS.forEach((apiVersion) => {
        if (apiVersion.status === 'active') {
            config.addServer(`/api/${apiVersion.version}`);
        }
    });

    const document = SwaggerModule.createDocument(app, config.build());

    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
            syntaxHighlight: {
                theme: 'monokai',
            },
        },
        customSiteTitle: 'Farmers Marketplace API Documentation',
        customfavIcon: '/favicon.ico',
    });
}; 