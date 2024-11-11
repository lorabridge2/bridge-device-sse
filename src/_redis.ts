import { createClient } from 'redis';

const DISABLED_PREFIX = "lorabridge:attributes:";
const ATTRIBUTES_PREFIX = "lorabridge:device:attributes";
const REGISTRY_PREFIX = "lorabridge:device:registry";
const LOCK_PREFIX = [REGISTRY_PREFIX, "lock"].join(":");
const HASH_IEEE = [REGISTRY_PREFIX, "ieee"].join(":");
const HASH_ID = [REGISTRY_PREFIX, "id"].join(":");
const REGISTRY_INDEX = [REGISTRY_PREFIX, "index"].join(":");

const getClient = async () => {
    const client = createClient({ url: process.env.redis_conn_string || "redis://127.0.0.1:6379" });
    client.on('error', (err) => console.log('Redis Client Error', err));

    await client.connect();
    return client;
};

// const client = createClient({ url: process.env.redis_conn_string || "redis://127.0.0.1:6379" });
// client.on('error', (err) => console.log('Redis Client Error', err));

// await client.connect();

export { getClient, ATTRIBUTES_PREFIX, DISABLED_PREFIX, REGISTRY_PREFIX, LOCK_PREFIX, HASH_ID, HASH_IEEE, REGISTRY_INDEX };
