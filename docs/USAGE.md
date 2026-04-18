# Usage Guide

## 1. End-to-end workflow

Open RTT usage has two halves:

- target firmware publishes the control block and services the API
- host tooling connects through the debugger and moves text in and out of the RAM rings

The minimum workflow is:

1. integrate the firmware library
2. place `.rtt_block` and `.rtt_buf` into debugger-visible RAM
3. call `rtt_init()`
4. flash and run the target
5. start a host backend and connect to the same target

## 2. Target-side example

For a quick smoke test, build something equivalent to `examples/f28p65x/rtt_demo.c`:

```c
#include "rtt.h"

static void app_init(void) {
    rtt_init();
    (void)rtt_write_line("jtag transport ready");
}

static void app_handle_host_input(void) {
    char ch;

    ch = rtt_read_char();
    if (ch == '\0') {
        return;
    }

    (void)rtt_write_char(ch);
}

int main(void) {
    app_init();

    for (;;) {
        app_handle_host_input();
    }
}
```

Once the host is connected, typed characters should echo back.

## 3. Using the DSS host backend

### 3.1 Required inputs

The current host script needs:

- a `.ccxml` debug configuration
- either the output file with symbols or the explicit control block address

General form:

```bash
dss.sh host/dss/rtt_host.js --ccxml <path> (--symbols <elf-or-out> | --cb-addr <addr>) [options]
```

Important options:

- `--part <name>`: choose built-in target defaults
- `--symbol <name>`: control block symbol name, default `g_rtt_block`
- `--session <regex>`: override the DSS session pattern
- `--poll-ms <ms>`: polling period, default `20`
- `--addr-unit-bytes <n>`: override native target address unit size
- `--list-parts`: print built-in profiles
- `--verbose`: enable extra logging
- `--self-test`: run host-side logic checks without connecting to hardware

### 3.2 TI C2000 plus XDS110 example

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/F28P65_XDS110.ccxml \
  --symbols /path/to/app.out \
  --part F28P65
```

Expected behavior:

- DSS opens the CPU1 session
- the script resolves `g_rtt_block`
- the host validates the magic and version
- target output appears in the console
- entered lines are pushed into the down ring with `CRLF`

### 3.3 TI MSPM0 plus XDS110 example

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/MSPM0G3519_XDS110.ccxml \
  --symbols /path/to/app.out \
  --part MSPM0G3519
```

For MSPM0 and most Cortex-M devices, address units are already byte-based.

### 3.4 Explicit address example

If you already know the native address of `g_rtt_block`:

```bash
dss.sh host/dss/rtt_host.js \
  --ccxml /path/to/target.ccxml \
  --cb-addr 0x20001000 \
  --addr-unit-bytes 1 \
  --session ".*CORTEX_M4.*"
```

On C28x, the numeric value passed to `--cb-addr` must be the native debugger address, not the protocol byte address.

## 4. Interactive commands

The DSS console has two local commands:

- `/dump`: print the current control block state
- `/quit`: exit the host

Any other line is sent to the target with `CRLF` appended.

## 5. Recommended firmware usage patterns

### 5.1 For logs

Use `rtt_write_line()` for human-readable status output:

```c
(void)rtt_write_line("boot ok");
```

### 5.2 For command processing

Use `rtt_read_line()` in the main loop or in a low-priority task:

```c
char line[RTT_MAX_LINE_CHARS + 1u];
int32_t len = rtt_read_line(line, (uint16_t)sizeof(line));

if (len > 0) {
    /* dispatch command */
}
```

### 5.3 For very simple bring-up

Use `rtt_read_char()` and echo characters or single-byte tokens.

## 6. Validation and checks

Native test:

```bash
make -C tests/native clean run
```

Combined checks:

```bash
tests/run_checks.sh
```

Notes:

- `tests/run_checks.sh` expects TI CGT and DSS to be installed
- you can override paths with `CGT_ROOT` and `DSS_BIN`

## 7. Troubleshooting

### 7.1 Magic mismatch

Likely causes:

- wrong symbol or wrong address
- target has not called `rtt_init()`
- the debugger is pointed at the wrong core or memory page

### 7.2 READY flag missing

Likely causes:

- firmware has not reached `rtt_init()`
- RAM was reset after initialization
- the host is looking at stale or incorrect memory

### 7.3 Version mismatch

Likely causes:

- host backend and target library were built from incompatible revisions
- protocol constants were changed on one side only

### 7.4 No output appears

Check:

- target is actually running
- `.rtt_block` and `.rtt_buf` are in accessible RAM
- the correct DSS session was selected
- `rtt_write_line()` is being called
- the poll rate is not excessively slow for your use case

### 7.5 Host input is dropped

Likely causes:

- down ring is too small
- firmware is not draining input
- the host line is longer than the free space because whole-line admission is enforced

### 7.6 Address conversion problems

Symptoms:

- control block validation fails even though the symbol name is correct
- ring buffer addresses look misaligned or nonsensical

Check:

- `--addr-unit-bytes 1` for byte-addressed targets
- `--addr-unit-bytes 2` for C28x

## 8. Suggested first demo

The simplest useful first milestone is:

1. print one startup line from the target
2. echo one character back for each character typed
3. confirm `/dump` shows stable ring pointers

Once that works, move to line-based commands and then to backend ports for other debuggers.
