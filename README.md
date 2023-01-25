# Device SSE
This repository is part of the [LoRaBridge](https://github.com/lorabridge/lorabridge) project.
It provides the docker image for the SSE server which provides data for the webinterface used on our bridge device.

The SSE server is a self-provided TypeScript application. It retrieves a list of ZigBee devices from the Zigbee2MQTT server and provides the data per HTTP as well as any updates to the data (e.g. new devices, additional attributes) per server-sent events (SSE) for the web interface.

This Nodejs server merges and extracts data from 2 zigbee2mqtt device data files (`state.json`, `database.db`) and provides a list of zigbee devices per Server-Sent Events (SSE).

After the client connets to `/sse`, it receives all current devices immediately and updates for new or modified devices afterwards.

Test data is available in [data](data). Real zigbee2mqtt data should override the data directory via docker volumes.

## Environment Variables

- `NODE_ENV`: `development` uses the test data files stored in `data_test`, otherwise the files in `data` are used
- `DEV_EUI`: lorawan identifier of the bridge device
- `redis_conn_string`: connection string used for redis (default: `redis://127.0.0.1:6379`)
- `mqtt_host`: IP or hostname of MQTT host
- `mqtt_port`: Port used by MQTT

## License

All the LoRaBridge software components and the documentation are licensed under GNU General Public License 3.0.

## Acknowledgements

The financial support from Internetstiftung/Netidee is gratefully acknowledged. The mission of Netidee is to support development of open-source tools for more accessible and versatile use of the Internet in Austria.
