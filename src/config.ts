import { secrets } from "./config/secrets_loader.js";
import { config_dev } from "./config_dev.js";
import { config_prod } from "./config_prod.js";

export let config = config_prod;
if (secrets.env == 'dev') {
    config = config_dev;
}
