# Firmware Integration Guide

## 1. What the target library provides

The target-side library exports a small C API:

- `rtt_init()`
- `rtt_write_char()`
- `rtt_write_line()`
- `rtt_read_char()`
- `rtt_read_line()`

Public declarations live in `firmware/rtt/include/rtt.h`.

## 2. Files to add to your build

Add these source files:

- `firmware/rtt/src/rtt.c`
- `firmware/rtt/src/rtt_ringbuf.c`
- `firmware/rtt/src/rtt_port.c`

Add this include path:

- `firmware/rtt/include`

The internal header `rtt_internal.h` is included by the library sources; application code only needs `rtt.h`.

## 3. Reserve debugger-visible RAM

The library places the control block and buffers in named sections:

- `.rtt_block`
- `.rtt_buf`

Those sections must land in RAM that:

- is accessible through the active debugger session
- is not shared with DMA or unrelated code
- stays allocated for the lifetime of the debug session

For TI C2000, the example linker snippet is:

```cmd
SECTIONS
{
   .rtt_block  : > USER_RTT_CB_RAM,  type = NOINIT
   .rtt_buf : > USER_RTT_BUF_RAM, type = NOINIT
}
```

Use `NOINIT` only if it matches your startup policy. The library itself clears the control block and both buffers inside `rtt_init()`.

## 4. Configure buffer sizes

The default configuration in `rtt_cfg.h` is:

- `RTT_UP_BUFFER_CELLS = 256`
- `RTT_DOWN_BUFFER_CELLS = 128`
- `RTT_MAX_LINE_CHARS = 80`

Override these macros from your build system or project configuration before compiling the library.

Practical sizing guidance:

- increase `RTT_UP_BUFFER_CELLS` if firmware emits bursts of logs
- increase `RTT_DOWN_BUFFER_CELLS` if host commands can be long
- keep `RTT_MAX_LINE_CHARS` aligned with the command grammar you expect to parse

Remember that one cell is 16 bits, not 8 bits.

## 5. Initialize early

Call `rtt_init()` during startup after RAM is available and before you expect the host to attach.

Minimal example:

```c
#include "rtt.h"

static void app_init(void) {
    rtt_init();
    (void)rtt_write_line("jtag transport ready");
}
```

The host will reject the control block until the `READY` flag is set by `rtt_init()`.

## 6. Writing output to the host

Use:

- `rtt_write_char(ch)` for byte-at-a-time output
- `rtt_write_line(text)` for line-oriented output with automatic `CRLF`

Behavior to keep in mind:

- the up ring uses drop-on-full semantics
- return value is the number of characters accepted
- if the ring is full, new output is dropped and `overflow_cnt` increases

If you care about loss detection, inspect the up ring overflow counter from the host side or expose your own diagnostic command in firmware.

## 7. Reading input from the host

There are two usage styles.

### 7.1 Raw character mode

```c
char ch = rtt_read_char();
if (ch != '\0') {
    (void)rtt_write_char(ch);
}
```

Use raw mode when you want immediate character echo or a custom parser.

### 7.2 Line-oriented command mode

```c
char line[RTT_MAX_LINE_CHARS + 1u];
int32_t len = rtt_read_line(line, (uint16_t)sizeof(line));

if (len > 0) {
    /* Parse command in line[] */
}
```

`rtt_read_line()`:

- preserves partial input until a line ending arrives
- collapses `CRLF` into one end-of-line event
- handles backspace and delete
- rejects non-printable characters outside the allowed ASCII range
- drops lines longer than `RTT_MAX_LINE_CHARS`

## 8. Minimal application structure

The example in `examples/f28p65x/rtt_demo.c` shows the smallest viable loop:

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

In a real application you would usually replace the echo path with a small command interpreter and periodic status writes.

## 9. Porting notes for different MCU families

### 9.1 TI C2000 / C28x

- native address units are 16-bit words
- the protocol still stores addresses in bytes
- `rtt_addr_to_protocol_bytes()` handles the conversion
- place `.rtt_block` and `.rtt_buf` in CPU-local RAM visible from the selected CCS session

### 9.2 Byte-addressed MCUs

Targets such as MSPM0, MSP430, STM32, ESP32, and most ARM Cortex devices are byte-addressed. For these devices:

- native address units are already bytes
- the protocol address values match the debugger-visible address numerically
- the same target-side code can usually be reused unchanged

### 9.3 Toolchain-specific section placement

`rtt_port.c` currently uses GCC-style `__attribute__((section(...)))`.

If your compiler uses another syntax:

- keep the symbol names `g_rtt_block`, `g_rtt_up_buffer`, and `g_rtt_down_buffer`
- keep the final memory layout and types unchanged
- update only the section placement syntax as needed

## 10. Integration checklist

- source files added to build
- include path added
- `.rtt_block` and `.rtt_buf` mapped to valid RAM
- `rtt_init()` called
- host can resolve `g_rtt_block` or you know the explicit control block address
- application loop services `rtt_read_line()` or `rtt_read_char()`

## 11. Common mistakes

- placing RTT buffers in RAM that the debugger session cannot read while the target is running
- forgetting to call `rtt_init()`
- using too small an up buffer for bursty logging
- expecting binary-safe transport even though the current implementation is ASCII-oriented
- mixing raw-char and line-read APIs without understanding that `rtt_read_char()` resets the line reader state
