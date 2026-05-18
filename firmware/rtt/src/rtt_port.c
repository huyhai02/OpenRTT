#include <limits.h>
#include <stdint.h>

#include "rtt_internal.h"

volatile rtt_control_block_t g_rtt_block __attribute__((section(".rtt_block")));
volatile uint16_t g_rtt_up_buffer[RTT_UP_BUFFER_CELLS] __attribute__((section(".rtt_buf")));
volatile uint16_t g_rtt_down_buffer[RTT_DOWN_BUFFER_CELLS] __attribute__((section(".rtt_buf")));

uint32_t rtt_addr_to_protocol_bytes(const volatile void *ptr) {
    uintptr_t raw_addr;

    raw_addr = (uintptr_t)ptr;
    return (uint32_t)raw_addr * (uint32_t)(CHAR_BIT / 8u);
}
