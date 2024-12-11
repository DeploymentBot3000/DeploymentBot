import { client } from "../custom_client.js";

export default function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    client.destroy();
    process.exit(0);
}