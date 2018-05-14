const SerialPort = require('serialport');
const Ready = require('parser-ready')
const Readline = require('parser-readline')
const config = require(`${process.cwd()}/config/config`);
const { loggerStderr, loggerStderrNl, loggerStdout, loggerStdoutNl } = require('./utilities');


let bracelet = null;
let belt = null;

function spHandler(socketHandler) {
    this.soch = socketHandler;

    this.init(socketHandler);
}

spHandler.prototype.init = function (socketHandler) {
    const that = this;
    SerialPort
        .list()
        .then((ports) => ports.map(that.portHandler.bind(that)))
        .then((parsers) => parsers.map(that.parserHandler.bind(that)))
        .then((data) => {
            socketHandler.spHandler = that;
            return data;
        })
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
spHandler.prototype.portHandler = function (port) {
    console.log(port);
    const sp = new SerialPort(port.comName, { baudRate: config.baudRate });

    switch (port.serialNumber) {
        case config.bracelet.serialNumber:
            if (bracelet === null) bracelet = sp;
            break;
        case config.belt.serialNumber:
            if (belt === null) belt = sp;
            break;
        default:
            break;
    }

    // if (belt === null)
    //     belt = sp;
    // else
    //     if (bracelet === null)
    //         bracelet = sp;

    return sp;
}

spHandler.prototype.readyHandler = function (port) {
    const ready = port.pipe(new Ready({ delimiter: 'A' }));

    ready.on('ready', () => port.write(`C${config.delimiter}`));

    return ready;
}

spHandler.prototype.parserHandler = function (ready) {
    const parser = ready.pipe(new Readline({ delimiter: config.delimiter }));

    parser.on('data', this.dataHandler.bind(this));
    parser.on('error', loggerStderrNl);

    return parser;
}

spHandler.prototype.emit = function (port, msg) {
    if (this[port]) {
        this[port].write(String(msg) + config.delimiter);
    } else {
        loggerStderrNl(`The specified port (${port}) is not available.`);
    }
}

spHandler.prototype.dataHandler = function (data) {
    loggerStdoutNl(data);
    switch (data) {
        case 'playPause':
            this.soch.io.emit('bobble', JSON.stringify({ action: 'PLAYPAUSE' }));
            break;
        case 'prev':
            this.soch.playExample();
            break;
        default:
            break;
    }
}

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


module.exports = (socketHandler) => new spHandler(socketHandler);
