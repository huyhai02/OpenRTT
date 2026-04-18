#ifndef RTT_PROTOCOL_H
#define RTT_PROTOCOL_H

#include <stddef.h>
#include <stdint.h>
#include <limits.h>

#ifdef __cplusplus
extern "C" {
#endif

#define RTT_PROTOCOL_VERSION         (0x00020000u)
#define RTT_MAGIC_CELLS              (16u)
#define RTT_FLAG_READY               (0x00000001u)
#define RTT_UP_POLICY_DROP_ON_FULL   (0x00000001u)
#define RTT_DOWN_POLICY_WHOLE_LINE   (0x00000002u)

typedef struct {
    uint32_t data_addr_bytes;
    uint32_t capacity_cells;
    uint32_t rd_off_cells;
    uint32_t wr_off_cells;
    uint32_t overflow_cnt;
    uint32_t policy;
} rtt_ring_desc_t;

typedef struct {
    uint16_t               magic_cells[RTT_MAGIC_CELLS];
    uint32_t               version;
    uint32_t               flags;
    uint32_t               total_bytes;
    rtt_ring_desc_t up_ring;
    rtt_ring_desc_t down_ring;
} rtt_control_block_t;

#define RTT_CHAR_OCTETS               ((uint32_t)(CHAR_BIT / 8u))
#define RTT_TO_OCTETS(units_)         ((uint32_t)(units_) * RTT_CHAR_OCTETS)
#define RTT_OFFSET_MAGIC_CELLS_OCTETS   RTT_TO_OCTETS(offsetof(rtt_control_block_t, magic_cells))
#define RTT_OFFSET_VERSION_OCTETS       RTT_TO_OCTETS(offsetof(rtt_control_block_t, version))
#define RTT_OFFSET_FLAGS_OCTETS         RTT_TO_OCTETS(offsetof(rtt_control_block_t, flags))
#define RTT_OFFSET_TOTAL_BYTES_OCTETS   RTT_TO_OCTETS(offsetof(rtt_control_block_t, total_bytes))
#define RTT_OFFSET_UP_RING_OCTETS       RTT_TO_OCTETS(offsetof(rtt_control_block_t, up_ring))
#define RTT_OFFSET_DOWN_RING_OCTETS     RTT_TO_OCTETS(offsetof(rtt_control_block_t, down_ring))

#define RTT_RING_OFFSET_DATA_ADDR_BYTES_OCTETS RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, data_addr_bytes))
#define RTT_RING_OFFSET_CAPACITY_CELLS_OCTETS  RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, capacity_cells))
#define RTT_RING_OFFSET_RD_OFF_CELLS_OCTETS    RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, rd_off_cells))
#define RTT_RING_OFFSET_WR_OFF_CELLS_OCTETS    RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, wr_off_cells))
#define RTT_RING_OFFSET_OVERFLOW_CNT_OCTETS    RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, overflow_cnt))
#define RTT_RING_OFFSET_POLICY_OCTETS          RTT_TO_OCTETS(offsetof(rtt_ring_desc_t, policy))

#define RTT_STATIC_ASSERT(name_, expr_) \
    typedef char rtt_static_assert_##name_[(expr_) ? 1 : -1]

RTT_STATIC_ASSERT(ring_desc_size, RTT_TO_OCTETS(sizeof(rtt_ring_desc_t)) == 24u);
RTT_STATIC_ASSERT(control_block_size, RTT_TO_OCTETS(sizeof(rtt_control_block_t)) == 92u);
RTT_STATIC_ASSERT(version_offset, RTT_OFFSET_VERSION_OCTETS == 32u);
RTT_STATIC_ASSERT(flags_offset, RTT_OFFSET_FLAGS_OCTETS == 36u);
RTT_STATIC_ASSERT(total_bytes_offset, RTT_OFFSET_TOTAL_BYTES_OCTETS == 40u);
RTT_STATIC_ASSERT(up_ring_offset, RTT_OFFSET_UP_RING_OCTETS == 44u);
RTT_STATIC_ASSERT(down_ring_offset, RTT_OFFSET_DOWN_RING_OCTETS == 68u);
RTT_STATIC_ASSERT(ring_policy_offset, RTT_RING_OFFSET_POLICY_OCTETS == 20u);

#ifdef __cplusplus
}
#endif

#endif
