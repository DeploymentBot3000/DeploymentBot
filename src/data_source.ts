import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "./config.js";
import Backups from "./tables/Backups.js";
import Deployment from "./tables/Deployment.js";
import LatestInput from "./tables/LatestInput.js";
import Queue from "./tables/Queue.js";
import QueueStatusMsg from "./tables/QueueStatusMsg.js";
import Settings from "./tables/Settings.js";
import Signups from "./tables/Signups.js";
import { error } from "./utils/logger.js";

export const dataSource = await initDataSource();

async function initDataSource(): Promise<DataSource> {
    if (config.database.host == null) {
        error('No database configuration provided, existing. If this is the first time you are running the bot, now is the time to update the secrets file.');
        process.exit(0);
    }
    return await new DataSource({
        ...config.database as DataSourceOptions,
        entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups, Settings]),
        synchronize: config.synchronizeDatabase,
        dropSchema: config.dropSchema,
    }).initialize();
}
