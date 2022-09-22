# Device-SSE

This Nodejs server merges and extracts data from 2 zigbee2mqtt device data files (`state.json`, `database.db`) and provides a list of zigbee devices per Server-Sent Events (SSE).

After the client connets to `/sse`, it receives all current devices immediately and updates for new or modified devices afterwards.

Test data is available in [data](data). Real zigbee2mqtt data should override the data directory via docker volumes.
