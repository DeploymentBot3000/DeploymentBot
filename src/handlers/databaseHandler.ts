import { DataSource, DataSourceOptions } from "typeorm";
import config from "../config.js";

import Backups from "../tables/Backups.js";
import Deployment from "../tables/Deployment.js";
import LatestInput from "../tables/LatestInput.js";
import Queue from "../tables/Queue.js";
import QueueStatusMsg from "../tables/QueueStatusMsg.js";
import Signups from "../tables/Signups.js";


const dataSource = new DataSource({
    ...config.database as DataSourceOptions,
    entities: Object.values([Backups, Deployment, LatestInput, Queue, QueueStatusMsg, Signups]),
    synchronize: config.synchronizeDatabase,
    dropSchema: config.resetDatabase
});

await dataSource.initialize();

export default dataSource;
