import { createServer } from "http";
import { createSession, createChannel } from "better-sse";
import { watch, readFileSync } from 'node:fs';
import 'dotenv/config'
import { getClient } from './_redis';
import { getClient as getMClient, state as zState, devCount } from './_mqtt';
import { getOsStats } from './_stats';

interface Device {
    devName: string;
    ieeeAddr: string;
    manufName: string;
    attributes: string[];
}

interface Stats extends Iterable<string> {
    [key: string]: any;
    lorawan: {
        txstatus: string;
        queueLength: string;
        status: string;
        devices: number;
    };
    zigbee: {
        status: string;
        devices: number;
    };
    interfaces: {
        [key: string]: string;
    };
    cpu: number;
    mem: number;
    disk: number;
    temp: number;
    uptime: string;
    deveui: string;
}

// const CORS = process.env.ALLOW_FROM || "http://127.0.0.1:3000";
let statePath: string;
let dbPath: string;
let watchPath: string;

if (process.env.NODE_ENV === "development") {
    statePath = "data_test/state.json";
    dbPath = "data_test/database.db";
    watchPath = "data_test/state.json";
} else {
    statePath = "data/state.json";
    dbPath = "data/database.db";
    watchPath = "data/state.json";
}

let devices: { [key: string]: Device };
let stats: Stats;

const channel = createChannel();
const statsChannel = createChannel();
let rclient: any;
let mclient;

const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", [req.headers['origin'] as string]);
    console.log(req.headers['origin']);
    switch (req.url) {
        case "/sse": {
            const session = await createSession(req, res);
            channel.register(session);
            session.push(devices, "init");
            break;
        }
        case "/devices": {
            res.end(JSON.stringify(devices));
            break;
        }
        case "/sse/stats": {
            const session = await createSession(req, res);
            statsChannel.register(session);
            // console.log(retrieveStats());
            session.push(stats, "init");
            // setTimeout(updateStats,1000);
            break;
        }
        case "/stats": {
            res.end(JSON.stringify(await retrieveStats()));
            break;
        }
        default: {
            res.writeHead(404).end();
        }
    }
});

function isDict(dict: {}) {
    return dict === Object(dict) && typeof dict !== 'function' && !Array.isArray(dict);
}

async function updateStats() {
    const tmp: Stats = await retrieveStats();
    const diff: any = {};
    for (const key in tmp) {
        if (stats[key] === undefined || (!isDict(tmp[key]) && tmp[key] !== stats[key])) {
            diff[key] = tmp[key];
        } else {
            for (const sub in tmp[key]) {
                if (stats[key][sub] === undefined || tmp[key][sub] !== stats[key][sub]) {
                    if (!diff[key]) {
                        diff[key] = {};
                    }
                    diff[key][sub] = tmp[key][sub];
                }
            }
        }
    }

    for (const key in stats) {
        if (tmp[key] === undefined) {
            diff[key] = null;
        } else {
            if (isDict(stats[key])) {
                for (const sub in stats[key]) {
                    if (tmp[key][sub] === undefined) {
                        if (diff[key] === undefined) {
                            diff[key] = {};
                        }
                        diff[key][sub] = null;
                    }
                }
            }
        }
    }

    if (Object.keys(diff).length !== 0) {
        // console.log(diff);
        statsChannel.broadcast(diff);
        stats = tmp;
    }
    setTimeout(updateStats, 1000);
}

async function retrieveStats(): Promise<Stats> {
    const lora = { txstatus: "unknown", queueLength: "unknown" };
    lora['txstatus'] = await rclient.get("txstatus") || "unknown";
    lora['queueLength'] = (await rclient.keys("lorabridge:device:*:message:*")).length.toString() || "0";

    const zigbee: { status: string, devices: number } = { status: "unknown", devices: 0 };

    zigbee['status'] = zState;
    zigbee['devices'] = devCount;

    return { ... await getOsStats(), lorawan: lora, zigbee: zigbee } as Stats;
}

function processData(state: { [key: string]: { [key: string]: any } }, db: { [key: string]: any }[]): { [key: string]: Device } {
    const devices: { [key: string]: Device } = {};
    for (const ieeeAddr in state) {
        const dev: { [key: string]: any } = {};
        dev["ieeeAddr"] = ieeeAddr;
        dev["attributes"] = Object.keys(state[ieeeAddr]);
        for (let i = 0; i < db.length; i++) {
            if (db[i]['ieeeAddr'] === ieeeAddr) {
                dev['manufName'] = db[i]['manufName'];
                dev['devName'] = db[i]['modelId'];
                break;
            }
        }
        devices[ieeeAddr] = dev as Device;
    }
    return devices;
}
function readDB(): { [key: string]: any }[] {
    const dbContent = readFileSync(dbPath, "utf-8");
    const db: { [key: string]: any }[] = [];
    dbContent.split(/\r?\n/).filter(n => n).forEach(line => {
        db.push(JSON.parse(line));
    });
    return db;
}

const state = JSON.parse(readFileSync(statePath, "utf-8"));
const db = readDB();

devices = processData(state, db);
// console.log(devices);

watch(watchPath, (eventType, filename) => {
    if (eventType === "change") {
        let newState;
        try {
            newState = JSON.parse(readFileSync(statePath, "utf-8"));
        } catch (e) {
            console.log("state file does not contain valid json");
            //e.g. vscode sometimes saves an empty file before actually storing the content
            return;
        }
        const newDB = readDB();
        const newDevices = processData(newState, newDB);
        console.log(newDevices);
        console.log("change");
        for (const device in newDevices) {
            if (!(device in (devices))) {
                channel.broadcast(newDevices[device]);
                devices[newDevices[device]['ieeeAddr']] = newDevices[device];
            } else {
                if (JSON.stringify(newDevices[device]) != JSON.stringify(devices[device])) {
                    channel.broadcast(newDevices[device]);
                    devices[newDevices[device]['ieeeAddr']] = newDevices[device];
                }
            }
        }
        if (Object.keys(devices).length > Object.keys(newDevices).length) {
            for (const device in devices) {
                if (!(device in newDevices)) {
                    channel.broadcast({ ieeeAddr: device, remove: true });
                    delete devices[device];
                }
            }
        }
    }
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const timeout = (p: Promise<any>, ms: number) => Promise.race([p, wait(ms).then(() => {
    throw new Error("Timeout after " + ms + " ms");
})]);

async function main() {
    rclient = await getClient();

    try {
        mclient = await timeout(getMClient(), 2000);
    } catch (error) { console.error(error); }

    stats = await retrieveStats();
    setTimeout(updateStats, 1000);

    server.listen(8080);
    console.log("listening on port 8080");
}

main();