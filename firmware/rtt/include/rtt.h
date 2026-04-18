#ifndef RTT_H
#define RTT_H

#include <stdint.h>

#include "rtt_cfg.h"
#include "rtt_protocol.h"

#ifdef __cplusplus
extern "C" {
#endif

#define RTT_READ_LINE_EMPTY         (0)
#define RTT_READ_LINE_INVALID       (-1)
#define RTT_READ_LINE_DROPPED       (-2)
#define RTT_READ_LINE_TOO_SMALL     (-3)

extern volatile rtt_control_block_t g_rtt_block;

void    rtt_init(void);
int32_t rtt_write_char(char ch);
int32_t rtt_write_line(const char *text);
char    rtt_read_char(void);
int32_t rtt_read_line(char *buffer, uint16_t buffer_chars);

#ifdef __cplusplus
}
#endif

#endif
