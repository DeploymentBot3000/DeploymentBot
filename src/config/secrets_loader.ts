/*
The secrets file and this loader exist because our hosting does not support env
variables or any other way to provide this dynamically.
*/

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fatal } from '../utils/logger.js';

interface Secrets {
    // Bot token - you can access it from the Discord Developer Portal: https://discord.com/developers/applications
    discord_app_token: string,
    db_host: string,
    db_username: string,
    db_password: string,
    db_name: string,
    env: 'dev' | 'prod',
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const rootDir = path.normalize(path.join(currentDirectory, '..', '..'));
const secretsFilePath = path.join(rootDir, 'secrets.json');

let fileData: string = null;
try {
    fileData = fs.readFileSync(secretsFilePath, 'utf-8');
} catch (e: any) {
    if ('JEST_WORKER_ID' in process.env) {
        fileData = JSON.stringify({
            discord_app_token: '',
            db_host: '',
            db_username: '',
            db_password: '',
            db_name: '',
            env: 'dev',
        });
    } else {
        fatal(`Failed to load secrets file. Please make sure you set up your secrets file at: ${secretsFilePath}. Error: ${e}`);
    }
}

export const secrets = JSON.parse(fileData) as Secrets;
