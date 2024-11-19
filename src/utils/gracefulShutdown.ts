import {client} from "../index.js";

export default function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    client.destroy().then(r => null);
    process.exit(0);
}