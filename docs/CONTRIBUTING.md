# Contributing to Open RTT

Open RTT is intended to be a practical open-source project. Contributions are welcome for firmware support, host backends, tests, examples, and documentation.

## 1. Good contribution areas

- new debugger backends such as OpenOCD, pyOCD, or J-Link
- new MCU examples such as STM32, ESP32, MSPM0, or generic ARM Cortex-M
- stronger tests for protocol compatibility
- documentation improvements
- bug fixes in line handling, buffer management, or address conversion

## 2. Before you start

Please read:

- [../README.md](../README.md)
- [protocol_spec.md](protocol_spec.md)
- the relevant integration or backend guide

If your change affects protocol-visible behavior, treat the spec as part of the code. The implementation and the documentation must move together.

## 3. Contribution rules

### 3.1 Keep target and host in sync

If you change:

- field offsets
- control block size
- ring semantics
- protocol version
- address conversion rules

then update all of these in the same change:

- `firmware/rtt/include/rtt_protocol.h`
- every affected host backend
- tests
- `docs/protocol_spec.md`

### 3.2 Prefer simple, inspectable designs

This project exists partly so the transport remains easy to inspect from a debugger script. Avoid unnecessary abstraction or protocol complexity unless it solves a real portability problem.

### 3.3 Add examples when adding support

If you add support for a new MCU family or debugger backend, also add:

- a small example
- usage notes
- any target-specific caveats

## 4. Recommended workflow

1. make the smallest coherent change that solves the problem
2. keep the public API and protocol impact explicit
3. add or update tests where behavior changes
4. update documentation before submitting

## 5. Validation checklist

At minimum, run what is relevant to your change:

- `make -C tests/native clean run`
- `tests/run_checks.sh`
- backend self-tests such as `dss.sh host/dss/rtt_host.js --self-test`

If you cannot run a hardware-dependent step, say so clearly in the contribution notes.

## 6. Code review expectations

Reviewers should be able to answer these questions quickly:

- is the memory layout still correct
- is the protocol version still accurate
- is target and host behavior still compatible
- are tests sufficient for the changed behavior
- does the documentation still match reality

## 7. Reporting issues

Useful bug reports usually include:

- target MCU and probe
- debugger stack used
- whether the target is byte-addressed or word-addressed
- the command used to start the host backend
- a `/dump` snapshot if available
- expected behavior vs actual behavior

## 8. Ideas that would help the project

- OpenOCD backend for STM32 and ESP32
- pyOCD backend for Cortex-M
- shared symbol-resolution utility for host backends
- more examples for line-based command interpreters
- CI that runs native tests automatically

## 9. Community note

If you build support for another MCU family, probe, or debugger, please contribute it back if possible. Open RTT becomes much more valuable when the transport stays common and the backend ecosystem grows in the open.
