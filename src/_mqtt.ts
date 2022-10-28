import * as mqtt from "async-mqtt";

const STATETOPIC = 'zigbee2mqtt/bridge/state';
const DEVICESTOPIC = 'zigbee2mqtt/bridge/devices';
let state = "unknown";
let devCount = 0;

const getClient = async () => {
    const mClient = await mqtt.connectAsync("mqtt://" + process.env.mqtt_host + ":" + process.env.mqtt_port);


    await mClient.subscribe([STATETOPIC, DEVICESTOPIC]);

    mClient.on("message", (topic, message, packet) => {
        if (topic === STATETOPIC) {
            // state = JSON.parse(message.toString())["state"];
            state = message.toString();
        } else if (topic === DEVICESTOPIC) {
            let i = 0;
            for (const dev of JSON.parse(message.toString())) {
                if (dev['type'] !== 'Coordinator') {
                    i++;
                }
            }
            devCount = i;
        }
    });
    return mClient;
}

export { state, devCount, getClient };
