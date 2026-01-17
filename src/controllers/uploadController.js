import uploadService from '../services/uploadService.js';
import { ok, badRequest, serverError } from '../utils/http.mjs';

/**
 * Controller pour gérer l'upload de fichiers
 */
class UploadController {

    /**
     * POST /recipes/upload - Générer une URL pré-signée pour uploader un fichier
     * Le client utilisera cette URL pour uploader directement vers S3
     */
    async getPresignedUrl(event) {
        try {
            // Parser le body
            let body;
            try {
                body = JSON.parse(event.body || '{}');
            } catch (parseError) {
                console.error('Erreur de parsing JSON:', parseError);
                return badRequest('Le corps de la requête doit être du JSON valide avec fileName, contentType et fileSize');
            }

            const { fileName, contentType, fileSize } = body;

            // Validations
            if (!fileName || !contentType || !fileSize) {
                return badRequest('fileName, contentType et fileSize sont requis');
            }

            // Générer l'URL pré-signée
            const result = await uploadService.generatePresignedUploadUrl(
                fileName,
                contentType,
                fileSize
            );

            return ok({
                message: 'URL d\'upload générée avec succès',
                data: result
            });

        } catch (error) {
            console.error('Erreur lors de la génération de l\'URL d\'upload:', error);

            if (error.message.includes('Type de fichier') || error.message.includes('Fichier trop')) {
                return badRequest(error.message);
            }

            return serverError('Erreur interne du serveur');
        }
    }
}

export default new UploadController();
