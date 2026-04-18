importPackage(Packages.com.ti.debug.engine.scripting);
importPackage(Packages.com.ti.ccstudio.scripting.environment);
importClass(java.lang.System);
importClass(java.lang.Thread);
importClass(java.lang.Runnable);
importClass(java.lang.Long);
importPackage(java.io);
importPackage(java.util.concurrent);

var MAGIC_ASCII = "JTAG-TRANSPORT2.";
var PROTOCOL_VERSION = 0x00020000;
var RTT_FLAG_READY = 0x00000001;
var TARGET_CELL_BYTES = 2;

var CONTROL_BLOCK_BYTES = 92;
var CONTROL_BLOCK_WORDS = CONTROL_BLOCK_BYTES / TARGET_CELL_BYTES;
var MAGIC_OFFSET_BYTES = 0;
var VERSION_OFFSET_BYTES = 32;
var FLAGS_OFFSET_BYTES = 36;
var TOTAL_BYTES_OFFSET_BYTES = 40;
var UP_RING_OFFSET_BYTES = 44;
var DOWN_RING_OFFSET_BYTES = 68;

var RING_DESC_BYTES = 24;
var RING_DATA_ADDR_BYTES_OFFSET = 0;
var RING_CAPACITY_CELLS_OFFSET = 4;
var RING_RD_OFF_CELLS_OFFSET = 8;
var RING_WR_OFF_CELLS_OFFSET = 12;
var RING_OVERFLOW_CNT_OFFSET = 16;
var RING_POLICY_OFFSET = 20;

var INPUT_EOF = "__RTT_INPUT_EOF__";
var TARGET_PROFILES = [
    {
        key: "MSPM0",
        aliases: ["MSPM0", "MSPM0C1104", "MSPM0G1105", "MSPM0G1507", "MSPM0G3107",
                  "MSPM0G3507", "MSPM0G3519", "MSPM03519", "MSPM0G350X", "MSPM0G351X",
                  "MSPM0L1105", "MSPM0L1306", "MSPM0L2228"],
        prefixes: ["MSPM0", "MSPM"],
        sessionPattern: ".*CORTEX_M0P.*",
        addrUnitBytes: 1,
        description: "MSPM0 / Cortex-M0+"
    },
    {
        key: "MSP430",
        aliases: ["MSP430", "MSP430F5", "MSP430F6", "MSP430FR", "MSP430FR2355", "MSP430FR5969"],
        prefixes: ["MSP430"],
        sessionPattern: ".*MSP430.*",
        addrUnitBytes: 1,
        description: "MSP430 primary core"
    },
    {
        key: "CORTEX_M4",
        aliases: ["TM4C", "TIVA", "MSP432", "MSP432E4", "CC13X2", "CC26X2",
                  "CC13X4", "CC26X4", "CC32XX"],
        prefixes: ["TM4C", "LM4F", "MSP432", "CC13", "CC26", "CC32"],
        sessionPattern: ".*CORTEX_M4.*",
        addrUnitBytes: 1,
        description: "TI Cortex-M4/M4F primary core"
    },
    {
        key: "CORTEX_M33",
        aliases: ["CC23", "CC27", "CC35", "CC37"],
        prefixes: ["CC23", "CC27", "CC35", "CC37"],
        sessionPattern: ".*CORTEX_M33.*",
        addrUnitBytes: 1,
        description: "TI Cortex-M33 primary core"
    },
    {
        key: "HERCULES_R4",
        aliases: ["TMS570", "RM46", "RM48", "RM57", "HERCULES"],
        prefixes: ["TMS570", "RM4", "RM5", "HERCULES"],
        sessionPattern: ".*CORTEX_R4.*",
        addrUnitBytes: 1,
        description: "TI Hercules Cortex-R4 primary core"
    },
    {
        key: "CORTEX_R5",
        aliases: ["AM243", "AM261", "AM263", "AM263P", "AM64"],
        prefixes: ["AM243", "AM261", "AM263", "AM263P", "AM64"],
        sessionPattern: ".*CORTEX_R5.*",
        addrUnitBytes: 1,
        description: "TI Cortex-R5 primary core"
    },
    {
        key: "F28P65",
        aliases: ["F28P65", "F28P650", "F28P659", "TMS320F28P650", "TMS320F28P659"],
        prefixes: ["F28P65", "TMS320F28P65"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F28P65x CPU1"
    },
    {
        key: "F28P55",
        aliases: ["F28P55", "F28P550", "F28P559", "TMS320F28P550", "TMS320F28P559"],
        prefixes: ["F28P55", "TMS320F28P55"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F28P55x CPU1"
    },
    {
        key: "F2838X",
        aliases: ["F2838", "F28388", "F28386", "TMS320F28388", "TMS320F28386"],
        prefixes: ["F2838", "TMS320F2838"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F2838x CPU1"
    },
    {
        key: "F2837XD",
        aliases: ["F2837", "F28379", "F28377", "TMS320F28379", "TMS320F28377"],
        prefixes: ["F2837", "TMS320F2837"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F2837xD CPU1"
    },
    {
        key: "F28004X",
        aliases: ["F28004", "F280049", "F280041", "TMS320F280049", "TMS320F280041"],
        prefixes: ["F28004", "TMS320F28004"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F28004x CPU1"
    },
    {
        key: "F28003X",
        aliases: ["F28003", "F280039", "F280037", "TMS320F280039", "TMS320F280037"],
        prefixes: ["F28003", "TMS320F28003"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F28003x CPU1"
    },
    {
        key: "F28002X",
        aliases: ["F28002", "F280025", "F280023", "F280021", "TMS320F280025", "TMS320F280023"],
        prefixes: ["F28002", "TMS320F28002"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F28002x CPU1"
    },
    {
        key: "F280015X",
        aliases: ["F280015", "F2800157", "F2800156", "TMS320F2800157", "TMS320F2800156"],
        prefixes: ["F280015", "TMS320F280015"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F280015x CPU1"
    },
    {
        key: "F280013X",
        aliases: ["F280013", "F2800137", "F2800135", "TMS320F2800137", "TMS320F2800135"],
        prefixes: ["F280013", "TMS320F280013"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F280013x CPU1"
    },
    {
        key: "F2807X",
        aliases: ["F2807", "F28075", "F28076", "TMS320F28075", "TMS320F28076"],
        prefixes: ["F2807", "TMS320F2807"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F2807x CPU1"
    },
    {
        key: "F2806X",
        aliases: ["F2806", "F28069", "F28062", "TMS320F28069", "TMS320F28062"],
        prefixes: ["F2806", "TMS320F2806"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "C2000 F2806x CPU1"
    },
    {
        key: "F28",
        aliases: ["F28", "C28X"],
        prefixes: ["F28", "TMS320F28"],
        sessionPattern: ".*CPU1.*",
        addrUnitBytes: 2,
        description: "Generic C2000 C28x CPU1"
    }
];

function fail(message) {
    throw new Error(message);
}

function padHex32(value) {
    var hex = String(Long.toHexString(value >>> 0));
    return ("00000000" + hex).slice(-8);
}

function logInfo(message) {
    System.out.println("[INFO] " + message);
}

function logWarn(message) {
    System.out.println("[WARN] " + message);
}

function logVerbose(enabled, message) {
    if (enabled) {
        logInfo(message);
    }
}

function usage() {
    var lines = [];
    lines.push("Usage:");
    lines.push("  dss.sh rtt_host.js --ccxml <path> (--symbols <out/elf> | --cb-addr <hex>) [options]");
    lines.push("");
    lines.push("Options:");
    lines.push("  --part <name>        Lookup target defaults from built-in table");
    lines.push("  --symbol <name>      Control block symbol name. Default: g_rtt_block");
    lines.push("  --session <regex>    Debug session pattern. Overrides --part");
    lines.push("  --poll-ms <ms>       Poll interval in milliseconds. Default: 20");
    lines.push("  --addr-unit-bytes <n> Native target address-unit size in bytes. Overrides --part");
    lines.push("  --list-parts         Print built-in target profiles and exit");
    lines.push("  --verbose            Enable verbose logging");
    lines.push("  --self-test          Run host-side logic self-test and exit");
    lines.push("");
    lines.push("Examples:");
    lines.push("  dss.sh rtt_host.js --ccxml /path/to/MSPM0G3519.ccxml --symbols /path/to/app.out --part MSPM0G3519");
    lines.push("  dss.sh rtt_host.js --ccxml /path/to/F28P65.ccxml --symbols /path/to/app.out --part F28P65");
    lines.push("");
    lines.push("Host commands:");
    lines.push("  /dump                Print the current control block snapshot");
    lines.push("  /quit                Exit the host console");
    return lines.join("\n");
}

function normalizePartNumber(text) {
    return String(text).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatTargetProfiles() {
    var lines = [];
    var i;
    var profile;

    lines.push("Built-in target profiles:");
    for (i = 0; i < TARGET_PROFILES.length; ++i) {
        profile = TARGET_PROFILES[i];
        lines.push("  " + profile.key +
                   "  session=" + profile.sessionPattern +
                   "  addr-unit-bytes=" + profile.addrUnitBytes +
                   "  aliases=" + profile.aliases.join(", ") +
                   "  desc=" + profile.description);
    }
    return lines.join("\n");
}

function lookupTargetProfile(partNumber) {
    var normalized = normalizePartNumber(partNumber);
    var i;
    var j;
    var profile;

    for (i = 0; i < TARGET_PROFILES.length; ++i) {
        profile = TARGET_PROFILES[i];
        for (j = 0; j < profile.aliases.length; ++j) {
            if (normalizePartNumber(profile.aliases[j]) === normalized) {
                return profile;
            }
        }
    }

    for (i = 0; i < TARGET_PROFILES.length; ++i) {
        profile = TARGET_PROFILES[i];
        for (j = 0; j < profile.prefixes.length; ++j) {
            if (normalized.indexOf(normalizePartNumber(profile.prefixes[j])) === 0) {
                return profile;
            }
        }
    }

    return null;
}

function applyTargetProfileDefaults(options) {
    var profile;

    if (options.partNumber === null) {
        return null;
    }

    profile = lookupTargetProfile(options.partNumber);
    if (profile === null) {
        fail("Unknown --part: " + options.partNumber + "\n\n" + formatTargetProfiles());
    }

    options.partProfileKey = profile.key;
    if (!options.sessionExplicit) {
        options.sessionPattern = profile.sessionPattern;
    }
    if (!options.addrUnitExplicit) {
        options.addrUnitBytes = profile.addrUnitBytes;
    }
    return profile;
}

function parseArgs(argv) {
    var options = {
        ccxml: null,
        symbols: null,
        cbAddr: null,
        partNumber: null,
        partProfileKey: null,
        symbolName: "g_rtt_block",
        sessionPattern: null,
        sessionExplicit: false,
        pollMs: 20,
        addrUnitBytes: null,
        addrUnitExplicit: false,
        listParts: false,
        verbose: false,
        selfTest: false
    };
    var i;
    var arg;

    for (i = 0; i < argv.length; ++i) {
        arg = String(argv[i]);
        if (arg === "--ccxml") {
            i += 1;
            options.ccxml = String(argv[i]);
        } else if (arg === "--symbols") {
            i += 1;
            options.symbols = String(argv[i]);
        } else if (arg === "--cb-addr") {
            i += 1;
            options.cbAddr = parseHexOrDecimal(String(argv[i]));
        } else if (arg === "--part") {
            i += 1;
            options.partNumber = String(argv[i]);
        } else if (arg === "--symbol") {
            i += 1;
            options.symbolName = String(argv[i]);
        } else if (arg === "--session") {
            i += 1;
            options.sessionPattern = String(argv[i]);
            options.sessionExplicit = true;
        } else if (arg === "--poll-ms") {
            i += 1;
            options.pollMs = parseInt(String(argv[i]), 10);
        } else if (arg === "--addr-unit-bytes") {
            i += 1;
            options.addrUnitBytes = parseInt(String(argv[i]), 10);
            options.addrUnitExplicit = true;
        } else if (arg === "--list-parts") {
            options.listParts = true;
        } else if (arg === "--verbose") {
            options.verbose = true;
        } else if (arg === "--self-test") {
            options.selfTest = true;
        } else if ((arg === "--help") || (arg === "-h")) {
            System.out.println(usage());
            return null;
        } else {
            fail("Unknown argument: " + arg + "\n\n" + usage());
        }
    }

    if (options.listParts) {
        System.out.println(formatTargetProfiles());
        return null;
    }
    if (options.selfTest) {
        return options;
    }
    applyTargetProfileDefaults(options);
    if (options.sessionPattern === null) {
        options.sessionPattern = ".*CPU1.*";
    }
    if (options.addrUnitBytes === null) {
        options.addrUnitBytes = 2;
    }
    if (!options.ccxml) {
        fail("Missing required --ccxml\n\n" + usage());
    }
    if ((options.symbols === null) && (options.cbAddr === null)) {
        fail("Provide either --symbols or --cb-addr\n\n" + usage());
    }
    if ((options.symbols !== null) && (options.cbAddr !== null)) {
        fail("Use only one of --symbols or --cb-addr\n\n" + usage());
    }
    if (!(options.pollMs > 0)) {
        fail("--poll-ms must be > 0");
    }
    if (!(options.addrUnitBytes > 0)) {
        fail("--addr-unit-bytes must be > 0");
    }
    return options;
}

function parseHexOrDecimal(text) {
    if ((text.indexOf("0x") === 0) || (text.indexOf("0X") === 0)) {
        return parseInt(text.substring(2), 16) >>> 0;
    }
    return parseInt(text, 10) >>> 0;
}

function wordsToU32(words, index) {
    return (((words[index] & 0xFFFF) | ((words[index + 1] & 0xFFFF) << 16)) >>> 0);
}

function u32ToWords(value) {
    value = value >>> 0;
    return [value & 0xFFFF, (value >>> 16) & 0xFFFF];
}

function byteOffsetToCellIndex(byteOffset) {
    if ((byteOffset % TARGET_CELL_BYTES) !== 0) {
        fail("Protocol byte offset is not aligned to cell size: " + byteOffset);
    }
    return (byteOffset / TARGET_CELL_BYTES) >>> 0;
}

function bytesToTargetUnits(byteAddress, addrUnitBytes) {
    if ((byteAddress % addrUnitBytes) !== 0) {
        fail("Byte address 0x" + padHex32(byteAddress) +
             " is not aligned to target address unit size " + addrUnitBytes);
    }
    return (byteAddress / addrUnitBytes) >>> 0;
}

function targetUnitsToBytes(addressUnits, addrUnitBytes) {
    return (addressUnits * addrUnitBytes) >>> 0;
}

function ringCellByteAddress(ring, cellOffset) {
    return (ring.dataAddrBytes + ((cellOffset * TARGET_CELL_BYTES) >>> 0)) >>> 0;
}

function asciiToCells(text) {
    var words = [];
    var i;

    for (i = 0; i < text.length; ++i) {
        words.push(text.charCodeAt(i) & 0x00FF);
    }
    return words;
}

function cellsToAscii(words) {
    var chars = [];
    var i;

    for (i = 0; i < words.length; ++i) {
        chars.push(String.fromCharCode(words[i] & 0x00FF));
    }
    return chars.join("");
}

function decodeMagic(words) {
    var start = byteOffsetToCellIndex(MAGIC_OFFSET_BYTES);
    return cellsToAscii(words.slice(start, start + MAGIC_ASCII.length));
}

function ringCount(ring) {
    if (ring.wr >= ring.rd) {
        return ring.wr - ring.rd;
    }
    return ring.capacity - (ring.rd - ring.wr);
}

function ringFree(ring) {
    return (ring.capacity - 1) - ringCount(ring);
}

function parseRing(words, baseOffsetBytes) {
    var baseIndex = byteOffsetToCellIndex(baseOffsetBytes);
    return {
        dataAddrBytes: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_DATA_ADDR_BYTES_OFFSET)),
        capacity: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_CAPACITY_CELLS_OFFSET)),
        rd: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_RD_OFF_CELLS_OFFSET)),
        wr: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_WR_OFF_CELLS_OFFSET)),
        overflow: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_OVERFLOW_CNT_OFFSET)),
        policy: wordsToU32(words, baseIndex + byteOffsetToCellIndex(RING_POLICY_OFFSET))
    };
}

function parseControlBlock(words) {
    return {
        magic: decodeMagic(words),
        version: wordsToU32(words, byteOffsetToCellIndex(VERSION_OFFSET_BYTES)),
        flags: wordsToU32(words, byteOffsetToCellIndex(FLAGS_OFFSET_BYTES)),
        totalBytes: wordsToU32(words, byteOffsetToCellIndex(TOTAL_BYTES_OFFSET_BYTES)),
        up: parseRing(words, UP_RING_OFFSET_BYTES),
        down: parseRing(words, DOWN_RING_OFFSET_BYTES)
    };
}

function validateRing(name, ring) {
    if (ring.capacity < 2) {
        fail(name + " ring capacity must be >= 2");
    }
    if ((ring.dataAddrBytes % TARGET_CELL_BYTES) !== 0) {
        fail(name + " ring data address is not aligned to " + TARGET_CELL_BYTES + " bytes");
    }
    if ((ring.rd >= ring.capacity) || (ring.wr >= ring.capacity)) {
        fail(name + " ring offsets are out of range");
    }
}

function validateControlBlock(snapshot) {
    if (snapshot.magic !== MAGIC_ASCII) {
        fail("Magic mismatch. Expected '" + MAGIC_ASCII + "', got '" + snapshot.magic + "'");
    }
    if ((snapshot.version >>> 0) !== (PROTOCOL_VERSION >>> 0)) {
        fail("Version mismatch. Expected 0x" + padHex32(PROTOCOL_VERSION) +
             ", got 0x" + padHex32(snapshot.version));
    }
    if ((snapshot.flags & RTT_FLAG_READY) === 0) {
        fail("Control block is not marked READY");
    }
    if (snapshot.totalBytes < CONTROL_BLOCK_BYTES) {
        fail("Control block total_bytes is smaller than the control block itself");
    }
    validateRing("up", snapshot.up);
    validateRing("down", snapshot.down);
}

function getDataPage(session) {
    if ((typeof Memory !== "undefined") && Memory.Page) {
        if ((typeof session.memory.getPage === "function") &&
            (Memory.Page.DATA !== undefined)) {
            return session.memory.getPage(Memory.Page.DATA);
        }
        if ((typeof session.memory.getPage === "function") &&
            (Memory.Page.PROGRAM !== undefined)) {
            return session.memory.getPage(Memory.Page.PROGRAM);
        }
        if (Memory.Page.PROGRAM !== undefined) {
            return Memory.Page.PROGRAM;
        }
    }
    return 0;
}

function toJsWordArray(raw, count) {
    var values = [];
    var i;

    for (i = 0; i < count; ++i) {
        values.push(Number(raw[i]) & 0xFFFF);
    }
    return values;
}

function readWords(session, addressWords, count) {
    var raw = session.memory.readData(getDataPage(session), addressWords, 16, count, false);
    return toJsWordArray(raw, count);
}

function writeWords(session, addressWords, words) {
    session.memory.writeData(getDataPage(session), addressWords, words, 16);
}

function readControlBlock(session, cbAddrBytes, addrUnitBytes) {
    return parseControlBlock(readWords(session, bytesToTargetUnits(cbAddrBytes, addrUnitBytes), CONTROL_BLOCK_WORDS));
}

function writeRingU32(session, cbAddrBytes, ringBaseOffsetBytes, fieldOffsetBytes, value, addrUnitBytes) {
    var fieldAddrBytes = (cbAddrBytes + ringBaseOffsetBytes + fieldOffsetBytes) >>> 0;
    writeWords(session, bytesToTargetUnits(fieldAddrBytes, addrUnitBytes), u32ToWords(value));
}

function resolveControlBlockAddress(session, options) {
    var address;

    if (options.cbAddr !== null) {
        return options.cbAddr >>> 0;
    }

    logVerbose(options.verbose, "Loading symbols from " + options.symbols);
    session.symbol.load(options.symbols);
    address = Number(session.symbol.getAddress(options.symbolName)) >>> 0;
    return address;
}

function resumeTarget(session, verbose) {
    try {
        session.target.runAsynch();
        logVerbose(verbose, "Issued target.runAsynch()");
        Thread.sleep(100);
        return true;
    } catch (runAsyncErr) {
        logVerbose(verbose, "target.runAsynch() unavailable: " + runAsyncErr);
    }

    try {
        session.target.run();
        logVerbose(verbose, "Issued target.run()");
        Thread.sleep(100);
        return true;
    } catch (runErr) {
        logVerbose(verbose, "target.run() unavailable: " + runErr);
    }

    logWarn("Unable to resume target after connect; target may remain halted.");
    return false;
}

function dumpSnapshot(snapshot) {
    logInfo("magic='" + snapshot.magic + "' version=0x" + padHex32(snapshot.version) +
            " flags=0x" + padHex32(snapshot.flags) + " total_bytes=" + snapshot.totalBytes);
    logInfo("up: data_bytes=0x" + padHex32(snapshot.up.dataAddrBytes) + " cap=" + snapshot.up.capacity +
            " rd=" + snapshot.up.rd + " wr=" + snapshot.up.wr +
            " free=" + ringFree(snapshot.up) + " overflow=" + snapshot.up.overflow +
            " policy=0x" + padHex32(snapshot.up.policy));
    logInfo("down: data_bytes=0x" + padHex32(snapshot.down.dataAddrBytes) + " cap=" + snapshot.down.capacity +
            " rd=" + snapshot.down.rd + " wr=" + snapshot.down.wr +
            " free=" + ringFree(snapshot.down) + " overflow=" + snapshot.down.overflow +
            " policy=0x" + padHex32(snapshot.down.policy));
}

function readUpText(session, cbAddrBytes, snapshot, addrUnitBytes) {
    var ring = snapshot.up;
    var available = ringCount(ring);
    var firstCount;
    var secondCount;
    var words = [];
    var newRd;

    if (available === 0) {
        return "";
    }

    firstCount = Math.min(available, ring.capacity - ring.rd);
    secondCount = available - firstCount;
    words = words.concat(readWords(session, bytesToTargetUnits(ringCellByteAddress(ring, ring.rd), addrUnitBytes), firstCount));
    if (secondCount > 0) {
        words = words.concat(readWords(session, bytesToTargetUnits(ring.dataAddrBytes, addrUnitBytes), secondCount));
    }

    newRd = (ring.rd + available) % ring.capacity;
    writeRingU32(session, cbAddrBytes, UP_RING_OFFSET_BYTES, RING_RD_OFF_CELLS_OFFSET, newRd, addrUnitBytes);
    return cellsToAscii(words);
}

function writeDownLine(session, cbAddrBytes, snapshot, line, addrUnitBytes) {
    var payload = line + "\r\n";
    var cells = asciiToCells(payload);
    var ring = snapshot.down;
    var free = ringFree(ring);
    var firstCount;
    var secondCount;
    var newWr;

    if (free < cells.length) {
        logWarn("Down buffer full. Dropping command.");
        return false;
    }

    firstCount = Math.min(cells.length, ring.capacity - ring.wr);
    secondCount = cells.length - firstCount;
    writeWords(session, bytesToTargetUnits(ringCellByteAddress(ring, ring.wr), addrUnitBytes), cells.slice(0, firstCount));
    if (secondCount > 0) {
        writeWords(session, bytesToTargetUnits(ring.dataAddrBytes, addrUnitBytes), cells.slice(firstCount));
    }

    newWr = (ring.wr + cells.length) % ring.capacity;
    writeRingU32(session, cbAddrBytes, DOWN_RING_OFFSET_BYTES, RING_WR_OFF_CELLS_OFFSET, newWr, addrUnitBytes);
    return true;
}

function spawnInputReader(queue, verbose) {
    var inputThread = new Thread(new Runnable() {
        run: function() {
            var reader = new BufferedReader(new InputStreamReader(System["in"]));
            var line;

            try {
                while (true) {
                    line = reader.readLine();
                    if (line === null) {
                        queue.offer(INPUT_EOF);
                        break;
                    }
                    queue.offer(String(line));
                }
            } catch (err) {
                if (verbose) {
                    logWarn("Input reader stopped: " + err);
                }
                queue.offer(INPUT_EOF);
            }
        }
    });

    inputThread.setName("jtag-stdin");
    inputThread.setDaemon(true);
    inputThread.start();
    return inputThread;
}

function runHost(options) {
    var env = ScriptingEnvironment.instance();
    var debugServer = env.getServer("DebugServer.1");
    var debugSession = null;
    var cbAddrUnits;
    var cbAddrBytes;
    var queue = new LinkedBlockingQueue();
    var shouldRun = true;
    var inputLine;
    var snapshot;
    var outputText;

    debugServer.setConfig(options.ccxml);
    debugSession = debugServer.openSession(options.sessionPattern);
    logVerbose(options.verbose, "Connecting session " + options.sessionPattern);
    debugSession.target.connect();
    logInfo("Resolved memory page = " + getDataPage(debugSession));
    if (options.partProfileKey !== null) {
        logInfo("Using target profile " + options.partProfileKey +
                " (session=" + options.sessionPattern +
                ", addr-unit-bytes=" + options.addrUnitBytes + ")");
    }

    cbAddrUnits = resolveControlBlockAddress(debugSession, options);
    cbAddrBytes = targetUnitsToBytes(cbAddrUnits, options.addrUnitBytes);
    logInfo("Control block native=0x" + padHex32(cbAddrUnits) +
            " protocol_bytes=0x" + padHex32(cbAddrBytes));
    resumeTarget(debugSession, options.verbose);
    spawnInputReader(queue, options.verbose);

    while (shouldRun) {
        try {
            snapshot = readControlBlock(debugSession, cbAddrBytes, options.addrUnitBytes);
            validateControlBlock(snapshot);
            outputText = readUpText(debugSession, cbAddrBytes, snapshot, options.addrUnitBytes);
            if (outputText.length > 0) {
                System.out.print(outputText);
            }

            inputLine = queue.poll();
            while (inputLine !== null) {
                inputLine = String(inputLine);
                if (inputLine == INPUT_EOF) {
                    logInfo("stdin closed");
                    shouldRun = false;
                    break;
                }
                if (inputLine == "/quit") {
                    shouldRun = false;
                    break;
                }
                if (inputLine == "/dump") {
                    dumpSnapshot(snapshot);
                } else if (inputLine.length > 0) {
                    writeDownLine(debugSession, cbAddrBytes, snapshot, inputLine, options.addrUnitBytes);
                }
                inputLine = queue.poll();
            }

            if (shouldRun) {
                Thread.sleep(options.pollMs);
            }
        } catch (err) {
            fail("Target/session error: " + err);
        }
    }

    if (debugSession !== null) {
        try {
            if (debugSession.target.isConnected()) {
                debugSession.target.disconnect();
            }
        } catch (disconnectErr) {
            logVerbose(options.verbose, "Disconnect warning: " + disconnectErr);
        }
        try {
            debugSession.terminate();
        } catch (terminateErr) {
            logVerbose(options.verbose, "Terminate warning: " + terminateErr);
        }
    }
    debugServer.stop();
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        fail("self-test: " + message + " (expected=" + expected + ", actual=" + actual + ")");
    }
}

function runSelfTest() {
    var ring;
    var payload;
    var profile;

    assertEqual(cellsToAscii(asciiToCells("abc")), "abc", "ASCII encode/decode round-trip");
    assertEqual(wordsToU32([0x5678, 0x1234], 0), 0x12345678, "u32 decode");
    payload = u32ToWords(0x89ABCDEF);
    assertEqual(payload[0], 0xCDEF & 0xFFFF, "u32 encode low");
    assertEqual(payload[1], 0x89AB, "u32 encode high");

    ring = { capacity: 8, rd: 0, wr: 0 };
    assertEqual(ringCount(ring), 0, "empty ring count");
    assertEqual(ringFree(ring), 7, "empty ring free");
    ring.wr = 6;
    assertEqual(ringCount(ring), 6, "linear ring count");
    assertEqual(ringFree(ring), 1, "linear ring free");
    ring.rd = 5;
    ring.wr = 1;
    assertEqual(ringCount(ring), 4, "wrapped ring count");
    assertEqual(ringFree(ring), 3, "wrapped ring free");
    assertEqual(ringFree({ capacity: 8, rd: 0, wr: 6 }) >= asciiToCells("X\r\n").length, false, "whole line admission");
    assertEqual(ringFree({ capacity: 8, rd: 0, wr: 3 }) >= asciiToCells("OK\r\n").length, true, "whole line fits");
    assertEqual(byteOffsetToCellIndex(44), 22, "byte offset to cell index");
    assertEqual(bytesToTargetUnits(0x120, 2), 0x90, "byte to native address units");
    assertEqual(targetUnitsToBytes(0x90, 2), 0x120, "native address units to bytes");
    assertEqual(ringCellByteAddress({ dataAddrBytes: 0x200 }, 3), 0x206, "ring cell byte address");
    profile = lookupTargetProfile("MSPM0G3519");
    assertEqual(profile.key, "MSPM0", "MSPM0 target lookup");
    assertEqual(profile.addrUnitBytes, 1, "MSPM0 addr-unit lookup");
    profile = lookupTargetProfile("MSP430FR2355");
    assertEqual(profile.key, "MSP430", "MSP430 target lookup");
    assertEqual(profile.sessionPattern, ".*MSP430.*", "MSP430 session lookup");
    profile = lookupTargetProfile("TM4C1294");
    assertEqual(profile.key, "CORTEX_M4", "TM4C target lookup");
    assertEqual(profile.addrUnitBytes, 1, "CORTEX_M4 addr-unit lookup");
    profile = lookupTargetProfile("AM263P4");
    assertEqual(profile.key, "CORTEX_R5", "CORTEX_R5 target lookup");
    profile = lookupTargetProfile("F28P65");
    assertEqual(profile.key, "F28P65", "F28P65 target lookup");
    assertEqual(profile.sessionPattern, ".*CPU1.*", "F28P65 session lookup");
    profile = lookupTargetProfile("F28388");
    assertEqual(profile.key, "F2838X", "F2838X target lookup");
    profile = lookupTargetProfile("F280039");
    assertEqual(profile.key, "F28003X", "F28003X target lookup");

    logInfo("self-test passed");
}

function main(argv) {
    var options = parseArgs(argv);

    if (options === null) {
        return;
    }
    if (options.selfTest) {
        runSelfTest();
        return;
    }

    runHost(options);
}

try {
    main(arguments);
} catch (err) {
    System.err.println("[ERROR] " + err);
    throw err;
}
