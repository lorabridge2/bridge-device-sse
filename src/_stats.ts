import * as fs from 'fs';
import osu from 'node-os-utils';
import * as os from 'os';
import process from 'process';

const TEMP_PATH = "/sys/class/thermal/thermal_zone0/temp";
const temp_available = fs.existsSync(TEMP_PATH);

async function getOsStats() {
    const lines = fs.readFileSync('stats/ips').toString().split('\n');
    const interfaces: { [key: string]: string } = {};
    for (const line of lines) {
        const tmp = line.split(' ');
        interfaces[tmp[2]] = tmp[7];
    }
    let temp = NaN;
    if (temp_available) {
        try {
            temp = parseInt(fs.readFileSync(TEMP_PATH).toString().trim()) / 1000;
        } catch (error) {
            console.error(error);
        }
    }
    const uptime = new Date(Date.now() - os.uptime() * 1000);
    uptime.setMilliseconds(0);
    return {
        interfaces: interfaces,
        cpu: await osu.cpu.usage(),
        mem: (await osu.mem.info()).freeMemPercentage,
        disk: +(await osu.drive.free('/')).freePercentage,
        temp: temp,
        uptime: uptime.toISOString(),
        deveui: process.env.DEV_EUI,
    };
}

export { getOsStats };