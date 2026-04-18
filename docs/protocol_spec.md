# Open RTT Protocol Specification

## 1. Scope

This document describes the RAM-visible protocol implemented by the current Open RTT target library and the DSS host backend in this repository.

Protocol version:

- `0x00020000`

Magic string:

- `JTAG-TRANSPORT2.`

The protocol is intentionally small:

- one control block
- one up ring (`target -> host`)
- one down ring (`host -> target`)
- 16-bit cells, with only the low 8 bits currently used for ASCII text payload

## 2. Terminology

- `cell`: one 16-bit storage slot in RAM
- `protocol byte address`: address expressed in bytes, even on targets whose native address unit is not 1 byte
- `native target address`: address representation expected by the debugger or symbol loader for the active MCU

The host backend must convert between native target address units and protocol byte addresses.

Examples:

- byte-addressed MCU: `protocol bytes = native address`
- C28x word-addressed MCU: `protocol bytes = native address * 2`

## 3. Memory layout

The control block type is `rtt_control_block_t` and its size is fixed at 92 bytes.

### 3.1 Control block layout

| Offset (bytes) | Size | Field |
| --- | ---: | --- |
| `0` | `32` | `magic_cells[16]` |
| `32` | `4` | `version` |
| `36` | `4` | `flags` |
| `40` | `4` | `total_bytes` |
| `44` | `24` | `up_ring` |
| `68` | `24` | `down_ring` |

The target library asserts these offsets in `rtt_protocol.h` and the DSS backend uses the same constants.

### 3.2 Magic field

`magic_cells[16]` stores the ASCII text:

```text
JTAG-TRANSPORT2.
```

Each character occupies one 16-bit cell. The low 8 bits carry the ASCII value.

### 3.3 Flags

Defined flags:

- `RTT_FLAG_READY = 0x00000001`

The target sets `READY` after the buffers, ring descriptors, and metadata have been initialized.

### 3.4 Total bytes

`total_bytes` is the sum of:

- control block bytes
- up buffer bytes
- down buffer bytes

The current target implementation computes:

```text
sizeof(control block) + sizeof(up buffer) + sizeof(down buffer)
```

expressed in protocol bytes.

## 4. Ring descriptor format

Each ring descriptor is 24 bytes:

| Offset (bytes) | Size | Field |
| --- | ---: | --- |
| `0` | `4` | `data_addr_bytes` |
| `4` | `4` | `capacity_cells` |
| `8` | `4` | `rd_off_cells` |
| `12` | `4` | `wr_off_cells` |
| `16` | `4` | `overflow_cnt` |
| `20` | `4` | `policy` |

All 32-bit fields are stored little-endian as two 16-bit cells:

- first cell = low 16 bits
- second cell = high 16 bits

## 5. Ring semantics

### 5.1 Common rules

- `capacity_cells` must be at least `2`
- `rd_off_cells` and `wr_off_cells` must stay in `[0, capacity_cells)`
- the implementation leaves one cell unused to distinguish full vs empty
- the ring is empty when `rd == wr`

Formulas used by both target and host:

```text
count = (wr >= rd) ? (wr - rd) : (capacity - (rd - wr))
free  = (capacity - 1) - count
```

### 5.2 Up ring

The up ring carries output from target firmware to the host.

Current policy:

- `RTT_UP_POLICY_DROP_ON_FULL = 0x00000001`

Behavior:

- target writes as many cells as fit
- cells that do not fit are dropped
- `overflow_cnt` is incremented by the number of dropped cells

### 5.3 Down ring

The down ring carries input from the host to the target.

Current policy:

- `RTT_DOWN_POLICY_WHOLE_LINE = 0x00000002`

Behavior expected from the host:

- append `CRLF` to every command line
- write the line only if the whole payload fits
- if not enough space is available, drop the command instead of writing a partial line

The checked-in DSS backend follows this rule.

## 6. Target-side behavior

### 6.1 Initialization sequence

`rtt_init()` performs the following steps:

1. clear the up buffer, down buffer, and magic cells
2. zero control block metadata
3. reset the line reader state
4. write the magic string
5. compute `total_bytes`
6. initialize the up ring descriptor
7. initialize the down ring descriptor
8. set `flags = RTT_FLAG_READY`

The host should not trust the control block until `READY` is visible.

### 6.2 Character encoding

The firmware stores ASCII characters in 16-bit cells. Only the low 8 bits are significant.

Current behavior:

- printable ASCII `0x20..0x7E` is accepted by the line reader
- backspace (`0x08`) and delete (`0x7F`) erase one pending input character
- other control characters are ignored by `rtt_read_line()`, except `CR` and `LF`

### 6.3 `rtt_write_line()`

`rtt_write_line(text)`:

- writes `text`
- appends `"\r\n"`
- returns the number of accepted characters
- may return a partial count if the up ring fills up

### 6.4 `rtt_read_line()`

`rtt_read_line(buffer, buffer_chars)` returns:

- `> 0`: completed line length
- `RTT_READ_LINE_EMPTY (0)`: no completed line yet
- `RTT_READ_LINE_INVALID (-1)`: invalid arguments
- `RTT_READ_LINE_DROPPED (-2)`: input line exceeded the configured line limit and was dropped until end-of-line
- `RTT_READ_LINE_TOO_SMALL (-3)`: caller buffer could not hold the completed line

Special handling:

- `CRLF` is treated as a single line ending
- `CR` alone or `LF` alone also completes a line
- calling `rtt_read_char()` resets the line reader state

## 7. Host-side behavior

The host backend must:

1. locate the control block by symbol or explicit address
2. read and validate the control block
3. verify magic, version, and `READY`
4. poll the up ring, print received text, and advance `up.rd`
5. accept user input, append `CRLF`, write to the down ring, and advance `down.wr`

The current DSS backend also supports these local host commands:

- `/dump`: print the current control block snapshot
- `/quit`: exit the console

These commands are handled entirely on the host side and are not part of the protocol payload.

## 8. Compatibility rules

If you change any of the following, you must update both target and host:

- control block size
- field offsets
- ring descriptor size
- character width
- ring admission rules
- protocol version

Recommended compatibility policy:

- bump the protocol version when layout or semantics change
- update `rtt_protocol.h`
- update every host backend constant table
- update tests and this document in the same change

## 9. Current implementation limits

- single control block
- single up ring and single down ring
- text only, not binary framed packets
- no timestamps, message priorities, or channel IDs
- no synchronization primitives beyond ring pointer ownership

These limits are deliberate for now. Simplicity makes the protocol easy to inspect from a debugger script and easy to port to new backends.
