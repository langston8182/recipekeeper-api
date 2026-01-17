import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const BUCKET_NAME = 'cmarchive-recipekeeper-pdf-recipies';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Service pour gérer l'upload de fichiers vers S3
 */
class UploadService {
    constructor() {
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-3' });
    }

    /**
     * Valider le type de fichier
     */
    validateFileType(contentType) {
        if (!ALLOWED_TYPES.includes(contentType)) {
            throw new Error(`Type de fichier non autorisé. Types acceptés: ${ALLOWED_TYPES.join(', ')}`);
        }
    }

    /**
     * Valider la taille du fichier
     */
    validateFileSize(size) {
        if (size > MAX_FILE_SIZE) {
            throw new Error(`Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }
    }

    /**
     * Générer un nom de fichier unique
     */
    generateFileName(originalName, contentType) {
        const extension = this.getExtension(contentType);
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const env = process.env.ENVIRONMENT || 'preprod';
        return `${env}/${timestamp}-${randomString}${extension}`;
    }

    /**
     * Obtenir l'extension du fichier selon le type MIME
     */
    getExtension(contentType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'application/pdf': '.pdf'
        };
        return extensions[contentType] || '';
    }

    /**
     * Générer une URL pré-signée pour l'upload
     * Cette méthode permet au client d'uploader directement vers S3
     */
    async generatePresignedUploadUrl(fileName, contentType, fileSize) {
        // Validations
        this.validateFileType(contentType);
        this.validateFileSize(fileSize);

        // Générer un nom de fichier unique
        const key = this.generateFileName(fileName, contentType);

        // Créer la commande S3
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
            Metadata: {
                'original-name': fileName
            }
        });

        // Générer l'URL pré-signée (valide 5 minutes)
        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

        return {
            uploadUrl,
            key,
            bucket: BUCKET_NAME,
            expiresIn: 300 // secondes
        };
    }
}

export default new UploadService();
