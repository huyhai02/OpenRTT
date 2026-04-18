#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "rtt.h"
#include "rtt_internal.h"

static int g_failures = 0;

#define TEST_ASSERT(expr_)                                                            \
    do {                                                                              \
        if (!(expr_)) {                                                               \
            fprintf(stderr, "ASSERT FAILED: %s:%d: %s\n", __FILE__, __LINE__, #expr_); \
            g_failures++;                                                             \
            return;                                                                   \
        }                                                                             \
    } while (0)

static void write_host_line(const char *text) {
    uint32_t len;
    uint32_t i;
    uint32_t free_cells;
    uint32_t wr;

    len = (uint32_t)strlen(text);
    free_cells = rtt_ring_free(&g_rtt_block.down_ring);
    TEST_ASSERT(free_cells >= len);

    wr = g_rtt_block.down_ring.wr_off_cells;
    for (i = 0u; i < len; ++i) {
        g_rtt_down_buffer[wr] = rtt_ascii_to_cell(text[i]);
        wr++;
        if (wr >= g_rtt_block.down_ring.capacity_cells) {
            wr = 0u;
        }
    }
    g_rtt_block.down_ring.wr_off_cells = wr;
}

static uint32_t drain_up(char *buffer, uint32_t buffer_size) {
    uint32_t rd;
    uint32_t wr;
    uint32_t idx;

    rd = g_rtt_block.up_ring.rd_off_cells;
    wr = g_rtt_block.up_ring.wr_off_cells;
    idx = 0u;
    while ((rd != wr) && (idx + 1u < buffer_size)) {
        buffer[idx++] = rtt_cell_to_ascii(g_rtt_up_buffer[rd]);
        rd++;
        if (rd >= g_rtt_block.up_ring.capacity_cells) {
            rd = 0u;
        }
    }
    buffer[idx] = '\0';
    g_rtt_block.up_ring.rd_off_cells = rd;
    return idx;
}

static void fill_up_buffer_with_char(char *buffer, uint32_t count, char ch) {
    uint32_t i;

    for (i = 0u; i < count; ++i) {
        buffer[i] = ch;
    }
    buffer[count] = '\0';
}

static void test_init_sets_metadata(void) {
    uint32_t expected_total_bytes;

    rtt_init();
    expected_total_bytes = RTT_TO_OCTETS(sizeof(g_rtt_block)) +
                           RTT_TO_OCTETS(sizeof(g_rtt_up_buffer)) +
                           RTT_TO_OCTETS(sizeof(g_rtt_down_buffer));

    TEST_ASSERT(g_rtt_block.version == RTT_PROTOCOL_VERSION);
    TEST_ASSERT(g_rtt_block.flags == RTT_FLAG_READY);
    TEST_ASSERT(g_rtt_block.total_bytes == expected_total_bytes);
    TEST_ASSERT(g_rtt_block.up_ring.capacity_cells == RTT_UP_BUFFER_CELLS);
    TEST_ASSERT(g_rtt_block.down_ring.capacity_cells == RTT_DOWN_BUFFER_CELLS);
    TEST_ASSERT(g_rtt_block.up_ring.data_addr_bytes == rtt_addr_to_protocol_bytes(g_rtt_up_buffer));
    TEST_ASSERT(g_rtt_block.down_ring.data_addr_bytes == rtt_addr_to_protocol_bytes(g_rtt_down_buffer));
    TEST_ASSERT(g_rtt_block.up_ring.rd_off_cells == 0u);
    TEST_ASSERT(g_rtt_block.up_ring.wr_off_cells == 0u);
    TEST_ASSERT(g_rtt_block.down_ring.rd_off_cells == 0u);
    TEST_ASSERT(g_rtt_block.down_ring.wr_off_cells == 0u);
    TEST_ASSERT(g_rtt_block.up_ring.overflow_cnt == 0u);
    TEST_ASSERT(g_rtt_block.down_ring.overflow_cnt == 0u);
}

static void test_write_line_and_wrap(void) {
    char output[64];

    rtt_init();
    g_rtt_block.up_ring.rd_off_cells = 250u;
    g_rtt_block.up_ring.wr_off_cells = 250u;

    TEST_ASSERT(rtt_write_line("abcd") == 6);
    TEST_ASSERT(g_rtt_block.up_ring.wr_off_cells == 0u);
    TEST_ASSERT(drain_up(output, sizeof(output)) == 6u);
    TEST_ASSERT(strcmp(output, "abcd\r\n") == 0);
}

static void test_write_overflow_increments_counter(void) {
    uint32_t max_payload;
    char     payload[300];

    rtt_init();
    max_payload = g_rtt_block.up_ring.capacity_cells - 3u;
    fill_up_buffer_with_char(payload, max_payload, 'A');

    TEST_ASSERT(rtt_write_line(payload) == (int32_t)(max_payload + 2u));
    TEST_ASSERT(rtt_write_char('B') == 0);
    TEST_ASSERT(g_rtt_block.up_ring.overflow_cnt == 1u);
}

static void test_read_char_consumes_down_ring(void) {
    rtt_init();

    write_host_line("ab");
    TEST_ASSERT(rtt_read_char() == 'a');
    TEST_ASSERT(rtt_read_char() == 'b');
    TEST_ASSERT(rtt_read_char() == '\0');
}

static void test_read_line_handles_crlf_and_backspace(void) {
    char    line[RTT_MAX_LINE_CHARS + 1u];
    int32_t len;

    rtt_init();

    write_host_line("ab\bcd\r\n");
    len = rtt_read_line(line, (uint16_t)sizeof(line));
    TEST_ASSERT(len == 3);
    TEST_ASSERT(strcmp(line, "acd") == 0);
    TEST_ASSERT(rtt_read_line(line, (uint16_t)sizeof(line)) == RTT_READ_LINE_EMPTY);
}

static void test_read_line_preserves_partial_input(void) {
    char    line[RTT_MAX_LINE_CHARS + 1u];
    int32_t len;

    rtt_init();

    write_host_line("hello");
    TEST_ASSERT(rtt_read_line(line, (uint16_t)sizeof(line)) == RTT_READ_LINE_EMPTY);

    write_host_line("\r\n");
    len = rtt_read_line(line, (uint16_t)sizeof(line));
    TEST_ASSERT(len == 5);
    TEST_ASSERT(strcmp(line, "hello") == 0);
}

static void test_read_line_reports_drop_when_too_long(void) {
    char     line[RTT_MAX_LINE_CHARS + 1u];
    char long_line[128];
    uint32_t i;

    rtt_init();

    for (i = 0u; i < sizeof(long_line) - 3u; ++i) {
        long_line[i] = 'x';
    }
    long_line[sizeof(long_line) - 3u] = '\r';
    long_line[sizeof(long_line) - 2u] = '\n';
    long_line[sizeof(long_line) - 1u] = '\0';
    write_host_line(long_line);
    TEST_ASSERT(rtt_read_line(line, (uint16_t)sizeof(line)) == RTT_READ_LINE_DROPPED);
}

static void test_read_line_reports_small_buffer(void) {
    char    line[4];
    int32_t len;

    rtt_init();

    write_host_line("hello\r\n");
    len = rtt_read_line(line, (uint16_t)sizeof(line));
    TEST_ASSERT(len == RTT_READ_LINE_TOO_SMALL);
}

static void test_read_char_resets_line_reader_state(void) {
    char    line[RTT_MAX_LINE_CHARS + 1u];
    int32_t len;

    rtt_init();

    write_host_line("ab");
    TEST_ASSERT(rtt_read_line(line, (uint16_t)sizeof(line)) == RTT_READ_LINE_EMPTY);
    write_host_line("c");
    TEST_ASSERT(rtt_read_char() == 'c');

    write_host_line("de\r\n");
    len = rtt_read_line(line, (uint16_t)sizeof(line));
    TEST_ASSERT(len == 2);
    TEST_ASSERT(strcmp(line, "de") == 0);
}

int main(void) {
    test_init_sets_metadata();
    test_write_line_and_wrap();
    test_write_overflow_increments_counter();
    test_read_char_consumes_down_ring();
    test_read_line_handles_crlf_and_backspace();
    test_read_line_preserves_partial_input();
    test_read_line_reports_drop_when_too_long();
    test_read_line_reports_small_buffer();
    test_read_char_resets_line_reader_state();

    if (g_failures != 0) {
        fprintf(stderr, "native tests failed: %d\n", g_failures);
        return EXIT_FAILURE;
    }

    printf("native tests passed\n");
    return EXIT_SUCCESS;
}
