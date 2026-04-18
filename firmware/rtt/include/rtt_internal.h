#ifndef RTT_INTERNAL_H
#define RTT_INTERNAL_H

#include <stdint.h>

#include "rtt.h"

typedef struct {
    char     line[RTT_MAX_LINE_CHARS + 1u];
    uint16_t len_chars;
    uint16_t drop_until_eol;
    uint16_t last_was_cr;
} rtt_reader_state_t;

extern volatile uint16_t g_rtt_up_buffer[RTT_UP_BUFFER_CELLS];
extern volatile uint16_t g_rtt_down_buffer[RTT_DOWN_BUFFER_CELLS];

uint32_t rtt_addr_to_protocol_bytes(const volatile void *ptr);
uint32_t rtt_ring_count(const volatile rtt_ring_desc_t *ring);
uint32_t rtt_ring_free(const volatile rtt_ring_desc_t *ring);
uint32_t rtt_ring_write_ascii(volatile rtt_ring_desc_t *ring,
                                         volatile uint16_t *buffer,
                                         const char *text,
                                         uint16_t len_chars);
int      rtt_ring_read_ascii(volatile rtt_ring_desc_t *ring,
                                        volatile uint16_t *buffer,
                                        char *ch_out);
uint16_t rtt_ascii_to_cell(char ch);
char     rtt_cell_to_ascii(uint16_t cell);

#endif
