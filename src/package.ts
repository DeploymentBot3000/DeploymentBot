import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fatal } from './utils/logger.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const rootDir = path.normalize(path.join(currentDirectory, '..'));
const packageFilePath = path.join(rootDir, 'package.json');

let fileData: string = null;
try {
    fileData = fs.readFileSync(packageFilePath, 'utf-8');
} catch (e: any) {
    fatal(`Failed to load package file at: ${packageFilePath}. Error: ${e}`);
}

export const npm_package = JSON.parse(fileData);
