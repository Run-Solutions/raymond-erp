import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly storageType: string;
    private s3Client: S3Client;
    private readonly bucket: string;

    constructor(private configService: ConfigService) {
        this.storageType = this.configService.get<string>('STORAGE_TYPE') || 'local';
        this.bucket = this.configService.get<string>('S3_BUCKET');

        if (this.storageType === 's3') {
            this.s3Client = new S3Client({
                region: this.configService.get<string>('S3_REGION'),
                endpoint: this.configService.get<string>('S3_ENDPOINT'),
                credentials: {
                    accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID'),
                    secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY'),
                },
                forcePathStyle: false, // DigitalOcean Spaces typically needs false
            });
            this.logger.log('Storage Service initialized with S3/Spaces');
        } else {
            this.logger.log('Storage Service initialized with Local Storage');
        }
    }

    async uploadFile(buffer: Buffer, folderPath: string, fileName: string, contentType: string): Promise<string> {
        if (this.storageType === 's3') {
            const key = `${folderPath}/${fileName}`.replace(/\/+/g, '/');
            try {
                await this.s3Client.send(
                    new PutObjectCommand({
                        Bucket: this.bucket,
                        Key: key,
                        Body: buffer,
                        ContentType: contentType,
                        ACL: 'public-read', // Spaces uses public-read for public access
                    }),
                );
                // Construct public URL
                const endpoint = this.configService.get<string>('S3_ENDPOINT')
                    .replace('https://', '')
                    .replace(/\/$/, ''); // Remove trailing slash
                
                const cleanKey = key.startsWith('/') ? key.substring(1) : key;
                return `https://${this.bucket}.${endpoint}/${cleanKey}`;
            } catch (error: any) {
                this.logger.error(`Error uploading to S3: ${error.message}`);
                throw error;
            }
        } else {
            // Local storage fallback
            const baseDir = path.join(process.cwd(), 'uploads', folderPath);
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir, { recursive: true });
            }
            const filePath = path.join(baseDir, fileName);
            fs.writeFileSync(filePath, buffer);
            return `/uploads/${folderPath}/${fileName}`.replace(/\/+/g, '/');
        }
    }

    /**
     * Helper to process base64 image strings
     */
    async uploadBase64Image(base64: string, folderPath: string, fileNamePrefix: string): Promise<string | null> {
        if (!base64 || !base64.startsWith('data:image')) return null;

        const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const extension = matches[1] === 'jpeg' ? 'jpg' : (matches[1] === 'png' ? 'png' : 'jpg');
        const fileName = `${fileNamePrefix}_${Date.now()}.${extension}`;
        const buffer = Buffer.from(matches[2], 'base64');
        const contentType = `image/${extension}`;

        return this.uploadFile(buffer, folderPath, fileName, contentType);
    }
}
