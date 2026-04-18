#include <stdint.h>

#include "rtt_internal.h"

static uint32_t rtt_ring_next(const volatile rtt_ring_desc_t *ring, uint32_t off) {
    uint32_t next;

    next = off + 1u;
    if (next >= ring->capacity_cells) {
        next = 0u;
    }
    return next;
}

static int rtt_ring_offsets_valid(const volatile rtt_ring_desc_t *ring) {
    if ((ring == 0) || (ring->capacity_cells < 2u)) {
        return 0;
    }
    if ((ring->rd_off_cells >= ring->capacity_cells) || (ring->wr_off_cells >= ring->capacity_cells)) {
        return 0;
    }
    return 1;
}

uint16_t rtt_ascii_to_cell(char ch) {
    return (uint16_t)(((unsigned int)ch) & 0x00FFu);
}

char rtt_cell_to_ascii(uint16_t cell) {
    return (char)(cell & 0x00FFu);
}

uint32_t rtt_ring_count(const volatile rtt_ring_desc_t *ring) {
    uint32_t rd;
    uint32_t wr;

    if (!rtt_ring_offsets_valid(ring)) {
        return 0u;
    }

    rd = ring->rd_off_cells;
    wr = ring->wr_off_cells;
    if (wr >= rd) {
        return wr - rd;
    }
    return ring->capacity_cells - (rd - wr);
}

uint32_t rtt_ring_free(const volatile rtt_ring_desc_t *ring) {
    uint32_t count;

    if (!rtt_ring_offsets_valid(ring)) {
        return 0u;
    }

    count = rtt_ring_count(ring);
    if (count >= (ring->capacity_cells - 1u)) {
        return 0u;
    }
    return (ring->capacity_cells - 1u) - count;
}

uint32_t rtt_ring_write_ascii(volatile rtt_ring_desc_t *ring,
                                         volatile uint16_t *buffer,
                                         const char *text,
                                         uint16_t len_chars) {
    uint32_t wr;
    uint32_t written;
    uint32_t dropped;

    if ((ring == 0) || (buffer == 0) || (text == 0) || !rtt_ring_offsets_valid(ring)) {
        return 0u;
    }

    wr = ring->wr_off_cells;
    written = 0u;
    while (written < len_chars) {
        if (rtt_ring_free(ring) == 0u) {
            break;
        }
        buffer[wr] = rtt_ascii_to_cell(text[written]);
        wr = rtt_ring_next(ring, wr);
        ring->wr_off_cells = wr;
        written++;
    }

    dropped = (uint32_t)len_chars - written;
    if (dropped != 0u) {
        ring->overflow_cnt += dropped;
    }
    return written;
}

int rtt_ring_read_ascii(volatile rtt_ring_desc_t *ring,
                                   volatile uint16_t *buffer,
                                   char *ch_out) {
    uint32_t rd;

    if ((ring == 0) || (buffer == 0) || (ch_out == 0) || !rtt_ring_offsets_valid(ring)) {
        return 0;
    }
    if (rtt_ring_count(ring) == 0u) {
        return 0;
    }

    rd = ring->rd_off_cells;
    *ch_out = rtt_cell_to_ascii(buffer[rd]);
    ring->rd_off_cells = rtt_ring_next(ring, rd);
    return 1;
}
