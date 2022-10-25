import { createClient } from 'redis';

const PREFIX = "lorabridge:attributes:";
const getClient = async () =>{
    const client = createClient({ url: process.env.redis_conn_string || "redis://127.0.0.1:6379" });
    client.on('error', (err) => console.log('Redis Client Error', err));

    await client.connect();
    return client;
};

// const client = createClient({ url: process.env.redis_conn_string || "redis://127.0.0.1:6379" });
// client.on('error', (err) => console.log('Redis Client Error', err));

// await client.connect();

export {getClient, PREFIX};
