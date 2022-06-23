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
            const session = await createSession(req, res);
            channel.register(session);
            session.push(devices);

            // session.push("Hello world!");
            // channel.broadcast(devices);

            break;
        }
        default: {
            res.writeHead(404).end();
        }
    }
});

function processData(state: { [key: string]: { [key: string]: any } }, db: { [key: string]: any }[]): { [key: string]: Device } {
    let devices: { [key: string]: Device } = {};
    for (let ieeeAddr in state) {
        let dev: { [key: string]: any } = {};
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
    let dbContent = readFileSync(dbPath, "utf-8");
    let db: { [key: string]: any }[] = [];
    dbContent.split(/\r?\n/).filter(n => n).forEach(line => {
        db.push(JSON.parse(line));
    });
    return db;
}

let state = JSON.parse(readFileSync(statePath, "utf-8"));
let dbContent = readFileSync(dbPath, "utf-8");
let db = readDB();

devices = processData(state, db);
// console.log(devices);

watch(watchPath, (eventType, filename) => {
    if (eventType === "change") {
        let newState = JSON.parse(readFileSync(statePath, "utf-8"));
        let newDB = readDB();
        let newDevices = processData(newState, newDB);
        for (let device in newDevices) {
            if (!(device in (devices))) {
                console.log("if1");
                channel.broadcast(newDevices[device]);
                devices[newDevices['device']['ieeeAddr']] = newDevices[device];
            } else {
                console.log("else");
                console.log(JSON.stringify(newDevices[device]));
                console.log(JSON.stringify(devices[device]));
                if (JSON.stringify(newDevices[device]) != JSON.stringify(devices[device])) {
                    console.log("if2");
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