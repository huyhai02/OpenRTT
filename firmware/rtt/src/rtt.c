#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "rtt_internal.h"

static rtt_reader_state_t g_rtt_reader;

static void rtt_set_magic(volatile uint16_t *magic_cells) {
    static const uint16_t k_magic_ascii[RTT_MAGIC_CELLS] = {
        'O', 'p', 'e', 'n', ' ', 'R', 'T', 'T',
        'v', '1', '.', '0', '.', '0', '.', '0'
    };
    uint16_t i;

    for (i = 0u; i < RTT_MAGIC_CELLS; ++i) {
        magic_cells[i] = (uint16_t)k_magic_ascii[i];
    }
}

static void rtt_clear_u16(volatile uint16_t *buffer, uint32_t count) {
    uint32_t i;

    for (i = 0u; i < count; ++i) {
        buffer[i] = 0u;
    }
}

static void rtt_reader_reset(void) {
    g_rtt_reader.line[0] = '\0';
    g_rtt_reader.len_chars = 0u;
    g_rtt_reader.drop_until_eol = 0u;
    g_rtt_reader.last_was_cr = 0u;
}

static void rtt_init_ring(volatile rtt_ring_desc_t *ring,
                                     uint32_t data_addr_bytes,
                                     uint32_t capacity_cells,
                                     uint32_t policy) {
    ring->data_addr_bytes = data_addr_bytes;
    ring->capacity_cells = capacity_cells;
    ring->rd_off_cells = 0u;
    ring->wr_off_cells = 0u;
    ring->overflow_cnt = 0u;
    ring->policy = policy;
}

static int32_t rtt_write_chars_internal(const char *text, uint16_t len_chars) {
    uint32_t written;

    if (text == 0) {
        return -1;
    }

    written = rtt_ring_write_ascii(&g_rtt_block.up_ring, g_rtt_up_buffer, text, len_chars);
    return (int32_t)written;
}

static int32_t rtt_copy_completed_line(char *buffer, uint16_t buffer_chars) {
    uint16_t len_chars;

    len_chars = g_rtt_reader.len_chars;
    if (buffer_chars <= len_chars) {
        rtt_reader_reset();
        return RTT_READ_LINE_TOO_SMALL;
    }

    memcpy(buffer, g_rtt_reader.line, (size_t)(len_chars + 1u) * sizeof(char));
    g_rtt_reader.line[0] = '\0';
    g_rtt_reader.len_chars = 0u;
    return (int32_t)len_chars;
}

void rtt_init(void) {
    uint32_t total_bytes;

    rtt_clear_u16(g_rtt_up_buffer, RTT_UP_BUFFER_CELLS);
    rtt_clear_u16(g_rtt_down_buffer, RTT_DOWN_BUFFER_CELLS);
    rtt_clear_u16(g_rtt_block.magic_cells, RTT_MAGIC_CELLS);

    g_rtt_block.version = 0u;
    g_rtt_block.flags = 0u;
    g_rtt_block.total_bytes = 0u;
    rtt_init_ring(&g_rtt_block.up_ring, 0u, 0u, 0u);
    rtt_init_ring(&g_rtt_block.down_ring, 0u, 0u, 0u);

    rtt_reader_reset();
    rtt_set_magic(g_rtt_block.magic_cells);
    total_bytes = RTT_TO_OCTETS(sizeof(g_rtt_block)) +
                  RTT_TO_OCTETS(sizeof(g_rtt_up_buffer)) +
                  RTT_TO_OCTETS(sizeof(g_rtt_down_buffer));

    g_rtt_block.version = RTT_PROTOCOL_VERSION;
    g_rtt_block.total_bytes = total_bytes;
    rtt_init_ring(&g_rtt_block.up_ring,
                             rtt_addr_to_protocol_bytes(g_rtt_up_buffer),
                             RTT_UP_BUFFER_CELLS,
                             RTT_UP_POLICY_DROP_ON_FULL);
    rtt_init_ring(&g_rtt_block.down_ring,
                             rtt_addr_to_protocol_bytes(g_rtt_down_buffer),
                             RTT_DOWN_BUFFER_CELLS,
                             RTT_DOWN_POLICY_WHOLE_LINE);
    g_rtt_block.flags = RTT_FLAG_READY;
}

int32_t rtt_write_char(char ch) {
    char buffer[1];

    buffer[0] = ch;
    return rtt_write_chars_internal(buffer, 1u);
}

int32_t rtt_write_line(const char *text) {
    static const char k_crlf[2] = {'\r', '\n'};
    uint16_t len_chars;
    int32_t  written;
    int32_t  suffix_written;

    if (text == 0) {
        return -1;
    }

    len_chars = 0u;
    while ((text[len_chars] != '\0') && (len_chars < 0xFFFFu)) {
        ++len_chars;
    }
    written = rtt_write_chars_internal(text, len_chars);
    if (written < 0) {
        return written;
    }

    suffix_written = rtt_write_chars_internal(k_crlf, 2u);
    if (suffix_written < 0) {
        return suffix_written;
    }
    return written + suffix_written;
}

char rtt_read_char(void) {
    char ch;

    if (rtt_ring_read_ascii(&g_rtt_block.down_ring, g_rtt_down_buffer, &ch) == 0) {
        return '\0';
    }

    rtt_reader_reset();
    return ch;
}

int32_t rtt_read_line(char *buffer, uint16_t buffer_chars) {
    char ch;

    if ((buffer == 0) || (buffer_chars == 0u)) {
        return RTT_READ_LINE_INVALID;
    }

    while (rtt_ring_read_ascii(&g_rtt_block.down_ring, g_rtt_down_buffer, &ch) != 0) {
        if (g_rtt_reader.drop_until_eol != 0u) {
            if ((ch == '\r') || (ch == '\n')) {
                if ((ch == '\n') && (g_rtt_reader.last_was_cr != 0u)) {
                    g_rtt_reader.last_was_cr = 0u;
                    continue;
                }

                rtt_reader_reset();
                return RTT_READ_LINE_DROPPED;
            }
            continue;
        }

        if ((ch == '\r') || (ch == '\n')) {
            if ((ch == '\n') && (g_rtt_reader.last_was_cr != 0u)) {
                g_rtt_reader.last_was_cr = 0u;
                continue;
            }

            g_rtt_reader.last_was_cr = (uint16_t)((ch == '\r') ? 1u : 0u);
            return rtt_copy_completed_line(buffer, buffer_chars);
        }

        g_rtt_reader.last_was_cr = 0u;
        if ((ch == '\b') || ((((unsigned int)ch) & 0x00FFu) == 0x7Fu)) {
            if (g_rtt_reader.len_chars != 0u) {
                g_rtt_reader.len_chars--;
                g_rtt_reader.line[g_rtt_reader.len_chars] = '\0';
            }
            continue;
        }

        if ((((unsigned int)ch) & 0x00FFu) < 0x20u || ((((unsigned int)ch) & 0x00FFu) > 0x7Eu)) {
            continue;
        }
        if (g_rtt_reader.len_chars >= RTT_MAX_LINE_CHARS) {
            g_rtt_reader.drop_until_eol = 1u;
            continue;
        }

        g_rtt_reader.line[g_rtt_reader.len_chars] = ch;
        g_rtt_reader.len_chars++;
        g_rtt_reader.line[g_rtt_reader.len_chars] = '\0';
    }

    return RTT_READ_LINE_EMPTY;
}
