import { createServer } from "http";
import { createSession, createChannel } from "better-sse";
import { watch, readFileSync } from 'node:fs';

interface Device {
    devName: string;
    ieeeAddr: string;
    manufName: string;
    attributes: string[];
}

const statePath = "data/state.json";
const dbPath = "data/database.db";
const watchPath = "data/state.json";
let devices: { [key: string]: Device };

const channel = createChannel();

const server = createServer(async (req, res) => {
    switch (req.url) {
        case "/sse": {
            res.setHeader("Access-Control-Allow-Origin",["http://127.0.0.1:3000"]);
            const session = await createSession(req, res);
            channel.register(session);
            session.push(devices, "init");

            // session.push("Hello world!");
            // channel.broadcast(devices);

            break;
        }
        case "/devices":{
            res.end(JSON.stringify(devices));
            break;
        }
        default: {
            res.writeHead(404).end();
        }
    }
});

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
// const dbContent = readFileSync(dbPath, "utf-8");
const db = readDB();

devices = processData(state, db);
// console.log(devices);

watch(watchPath, (eventType, filename) => {
    if (eventType === "change") {
        const newState = JSON.parse(readFileSync(statePath, "utf-8"));
        const newDB = readDB();
        const newDevices = processData(newState, newDB);
        for (const device in newDevices) {
            if (!(device in (devices))) {
                channel.broadcast(newDevices[device]);
                devices[newDevices['device']['ieeeAddr']] = newDevices[device];
            } else {
                // console.log(JSON.stringify(newDevices[device]));
                // console.log(JSON.stringify(devices[device]));
                if (JSON.stringify(newDevices[device]) != JSON.stringify(devices[device])) {
                    channel.broadcast(newDevices[device]);
                    devices[newDevices[device]['ieeeAddr']] = newDevices[device];
                }
            }
        }
    }
    // console.log(`event type is: ${eventType}`);
    // if (filename) {
    //     console.log(`filename provided: ${filename}`);
    // } else {
    //     console.log('filename not provided');
    // }
});

server.listen(8080);