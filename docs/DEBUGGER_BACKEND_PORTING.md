# Debugger Backend Porting Guide

## 1. Current host backend

The repository currently includes one host implementation:

- `host/dss/rtt_host.js`

It runs inside TI Code Composer Studio DSS and talks to the target through the debugger session selected by a `.ccxml` configuration. It works well with XDS110 and other probes supported by CCS because the Open RTT protocol itself only requires memory reads and writes.

The backend is debugger-specific, but the protocol is not.

## 2. What every backend must do

Any backend for Open RTT needs only a small set of capabilities:

1. connect to the target
2. resolve the control block address
3. read 16-bit cells from target memory
4. write 16-bit cells to target memory
5. optionally keep the target running while polling memory

The rest is protocol logic implemented in software.

Backend pseudocode:

```text
connect()
cb_addr = resolve_symbol("g_rtt_block") or use explicit address

loop:
    cb = read_control_block(cb_addr)
    validate magic/version/READY

    up_text = read_available_up_cells(cb.up)
    print(up_text)
    write new up.rd

    if stdin line exists:
        payload = line + CRLF
        if down.free >= payload.length:
            write payload to down ring
            write new down.wr
        else:
            drop the command
```

## 3. DSS backend behavior today

The checked-in DSS backend supports:

- control block resolution by `--symbols` plus symbol name
- control block resolution by explicit `--cb-addr`
- target profile lookup with `--part`
- explicit overrides for `--session` and `--addr-unit-bytes`
- polling-based output streaming
- line-oriented input from stdin
- host-side commands `/dump` and `/quit`
- a small `--self-test` mode

The built-in target profile table already covers several TI families, including:

- MSPM0
- MSP430
- Cortex-M4 and Cortex-M33 based TI devices
- Hercules Cortex-R4
- Cortex-R5 devices such as AM243 and AM263
- multiple C2000 families such as F28P65x, F2838x, F28003x, and others

## 4. TI DSS plus XDS110 workflow

For TI MCUs, a typical setup is:

1. build firmware with symbols
2. flash it to the target
3. create a CCS `.ccxml` that selects the device and the XDS110 probe
4. start the host script with DSS

Example:

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/F28P65_XDS110.ccxml \
  --symbols /path/to/app.out \
  --part F28P65
```

Another example for a byte-addressed target:

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/MSPM0G3519_XDS110.ccxml \
  --symbols /path/to/app.out \
  --part MSPM0G3519
```

Why `--part` matters:

- it picks the default DSS session pattern
- it selects the native target address unit size

The XDS110 probe is not special to the protocol. It is simply one convenient probe family already supported by CCS and DSS.

## 5. Address-unit handling

This is the main portability detail many backends get wrong.

The protocol always stores `data_addr_bytes` in bytes. Your debugger API may not.

Examples:

- ARM Cortex-M, STM32, ESP32, MSPM0: debugger addresses are usually byte-based, so `addr-unit-bytes = 1`
- TI C28x: debugger addresses are often word-based, so `addr-unit-bytes = 2`

A portable backend therefore needs two conversion helpers:

- native target address units -> protocol bytes
- protocol bytes -> native target address units

## 6. Backend contract details

To be protocol-compatible, a backend should preserve these rules:

- read and write target memory as 16-bit cells
- decode 32-bit metadata as little-endian pairs of 16-bit cells
- do not trust the control block before `READY`
- reject mismatched magic or protocol version
- honor the down-ring whole-line rule
- advance `up.rd` only after the text has been captured

## 7. Porting ideas for other debuggers

### 7.1 OpenOCD

Good fit for:

- STM32
- ESP32
- generic ARM Cortex-M boards
- some RISC-V targets depending on the probe and target support

Typical implementation options:

- drive OpenOCD through Tcl, Telnet, or its GDB server
- resolve `g_rtt_block` from the ELF symbol table locally
- use memory read and write commands to move 16-bit cells

Watch for:

- target halt vs run access policy
- multi-core selection on ESP32
- access latency when polling aggressively

### 7.2 pyOCD

Good fit for:

- CMSIS-DAP probes
- many Cortex-M devices

Implementation shape:

- parse the ELF to find `g_rtt_block`
- use pyOCD memory APIs for 16-bit reads and writes
- keep the same protocol validation logic from the DSS backend

### 7.3 ST-Link based flows

Good fit for:

- STM32 targets

Possible transports:

- OpenOCD with ST-Link
- ST's own debug APIs if you already use them in tooling

Main requirement:

- the chosen API must allow repeated RAM access from the host while the firmware is running or between brief halts

### 7.4 J-Link

Good fit for:

- broad MCU coverage
- fast memory polling

Implementation options:

- J-Link Commander scripting
- J-Link SDK bindings
- a small bridge process that exposes read/write primitives to a higher-level host

### 7.5 ESP32 and Xtensa targets

Good fit for:

- OpenOCD-based flows
- probe hardware such as ESP-Prog or generic JTAG adapters

Special notes:

- select the correct core if the target is multicore
- verify that RAM remains readable during the expected run state
- keep RTT memory out of regions that can be transparently remapped or reclaimed by startup code

## 8. MCU family notes

### 8.1 STM32 and generic ARM Cortex-M

These are straightforward because they are byte-addressed and most host APIs already expose byte-based memory addresses. Usually the backend work is mostly about symbol lookup and a stable poll loop.

### 8.2 ESP32

ESP32 integration is also feasible, but you need to be stricter about:

- core selection
- memory region choice
- OpenOCD behavior while the target is free-running

### 8.3 TI C2000

This is the motivating case for the 16-bit cell transport and byte-address abstraction. Backend authors must be careful not to treat the symbol address and the protocol byte address as the same number on word-addressed parts.

## 9. Recommended backend architecture

Keep the code split into three layers:

1. debugger adapter
2. protocol parser and validator
3. terminal or application UI

That separation makes it easier to reuse the protocol logic for:

- DSS
- OpenOCD
- pyOCD
- custom lab tooling
- GUI frontends

## 10. Suggested next backend targets

If you want to expand this project, these are high-value additions:

- OpenOCD backend for STM32 and ESP32
- pyOCD backend for CMSIS-DAP targets
- J-Link backend for generic ARM Cortex devices
- a reusable ELF-symbol resolver shared by all host backends

Each backend should ship with:

- at least one concrete MCU example
- a smoke test or self-test
- updated usage documentation
