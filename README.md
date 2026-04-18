# Open RTT

Open RTT is a small open-source RAM transport for embedded targets and debugger-side host tools. It gives firmware a lightweight text channel without consuming a UART, USB CDC endpoint, or extra board wiring. The target exposes a fixed control block plus two ring buffers in RAM; the host reads and writes that RAM through the active debug probe.

The current repository contains:

- `firmware/rtt`: portable target-side C library
- `host/dss`: TI DSS host backend
- `examples/f28p65x`: minimal C2000 integration example
- `tests`: native tests and a basic toolchain check script

Open RTT is intentionally simple:

- one control block in RAM
- one up ring (`target -> host`)
- one down ring (`host -> target`)
- ASCII payloads stored in 16-bit cells
- line-oriented command path from host to target

It is inspired by the RTT style of debugger-assisted I/O, but the protocol and implementation in this repository are intentionally explicit and easy to reimplement for other debuggers and MCU families.

## Why use it

- early bring-up when no serial path is available yet
- interactive commands over JTAG or SWD
- debug logs without dedicating board pins
- a common transport shape for TI C2000, MSPM0, MSP430, Cortex-M, Cortex-R, and other targets

## Repository layout

- `firmware/rtt/include/rtt.h`: public target API
- `firmware/rtt/include/rtt_protocol.h`: wire-visible memory layout
- `firmware/rtt/src`: target implementation
- `host/dss/rtt_host.js`: debugger-side polling host for CCS DSS
- `examples/f28p65x/linker_snippet.cmd`: linker section example
- `examples/f28p65x/rtt_demo.c`: minimal echo application
- `tests/native/test_rtt.c`: native behavior tests

## Quick start

1. Add these target files to your firmware build:
   - `firmware/rtt/src/rtt.c`
   - `firmware/rtt/src/rtt_ringbuf.c`
   - `firmware/rtt/src/rtt_port.c`
   - include path `firmware/rtt/include`
2. Reserve RAM for `.rtt_block` and `.rtt_buf`.
3. Call `rtt_init()` during system startup.
4. Use `rtt_write_line()` or `rtt_write_char()` to publish output.
5. Use `rtt_read_line()` or `rtt_read_char()` to consume host input.
6. Start the host backend from DSS:

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/target_xds110.ccxml \
  --symbols /path/to/app.out \
  --part F28P65
```

If the symbol table is unavailable, use `--cb-addr <native-address>` instead of `--symbols`.

## Documentation

- [docs/README.md](docs/README.md): documentation index
- [docs/protocol_spec.md](docs/protocol_spec.md): control block and ring format
- [docs/FIRMWARE_INTEGRATION.md](docs/FIRMWARE_INTEGRATION.md): target-side integration guide
- [docs/DEBUGGER_BACKEND_PORTING.md](docs/DEBUGGER_BACKEND_PORTING.md): host/backend design and porting notes
- [docs/USAGE.md](docs/USAGE.md): end-to-end usage and troubleshooting
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): contribution workflow

## Current capabilities

- fixed protocol version `0x00020000`
- 92-byte control block
- 16-bit transport cells so C28x word-addressed targets are handled cleanly
- host-side target profiles for several TI MCU families in the DSS backend
- whole-line admission on the down ring so partial commands are not injected into firmware

## Current limitations

- single channel only
- ASCII payloads only
- no binary framing yet
- no timestamps or message metadata
- DSS backend is the only host backend currently checked in

## Open source contributions

This project is intended to be maintained as an open-source transport library. Contributions are welcome for:

- new debugger backends
- new MCU integration examples
- protocol review and hardening
- tests and CI improvements
- documentation fixes and translations

If you want to contribute code, examples, or target support, start with [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Backend ports for ST-Link, OpenOCD, pyOCD, J-Link, ESP-Prog, and similar tools are especially useful.
