import { DataSource, DataSourceOptions } from "typeorm";
import config from "./config.js";
import Backups from "./tables/Backups.js";
import Deployment from "./tables/Deployment.js";
import LatestInput from "./tables/LatestInput.js";
import Queue from "./tables/Queue.js";
import QueueStatusMsg from "./tables/QueueStatusMsg.js";
import Settings from "./tables/Settings.js";
import Signups from "./tables/Signups.js";

export const dataSource = await new DataSource({
    ...config.database as DataSourceOptions,
    entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups, Settings]),
    synchronize: config.synchronizeDatabase,
    dropSchema: config.dropSchema,
}).initialize();
