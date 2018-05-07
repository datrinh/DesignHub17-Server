const SerialPort = require('serialport');
const Ready = require('parser-ready')
const Readline = require('parser-readline')
const config = require(`${process.cwd()}/config/config`);
const { loggerStderr, loggerStderrNl, loggerStdout, loggerStdoutNl } = require('./utilities');


let bracelet = null;
let belt = null;

function spHandler() {
    SerialPort
        .list()
        .then((ports) => ports.map(this.portHandler))
        .then((parsers) => parsers.forEach(this.parserHandler))
        .then(() => loggerStdoutNl(this.beltPort))
        .catch(loggerStderr);
}

/**
 * @param {object} port desc
 * @example
 * { comName: 'COM13',
 *   manufacturer: 'Silicon Labs',
 *   serialNumber: '00BCAC79',
 *   pnpId: 'USB\\VID_10C4&PID_EA60\\00BCAC79',
 *   locationId: 'Port_#0007.Hub_#0006',
 *   vendorId: '10C4',
 *   productId: 'EA60' }
 */
spHandler.prototype.portHandler = (port) => {
    const sp = new SerialPort(port.comName, { baudRate: config.baudRate });

    switch (port.serialNumber) {
        case config.bracelet.serialNumber:
            if (bracelet === null) bracelet = port;
            break;
        case config.belt.serialNumber:
            if (belt === null) belt = port;
            break;
        default:
            break;
    }

    return sp;
}

spHandler.prototype.readyHandler = (port) => {
    const ready = port.pipe(new Ready({ delimiter: 'A' }));

    ready.on('ready', () => port.write(config.delimiter));

    return ready;
}

spHandler.prototype.parserHandler = (ready) => {
    const parser = ready.pipe(new Readline({ delimiter: config.delimiter }));

    parser.on('data', this.dataHandler);
    parser.on('error', (err) => loggerStderrNl(err));

    return parser;
}

spHandler.prototype.dataHandler = (data) => loggerStdoutNl(data);

Object.defineProperties(spHandler.prototype, {
    braceletPort: {
        get() {
            return bracelet;
        }
    },
    beltPort: {
        get() {
            return belt;
        }
}
});


module.exports = (messageHandler) => new spHandler(messageHandler);
