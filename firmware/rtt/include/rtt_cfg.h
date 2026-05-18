#ifndef RTT_CFG_H
#define RTT_CFG_H

#ifndef RTT_UP_BUFFER_CELLS
#define RTT_UP_BUFFER_CELLS         (1024u)
#endif

#ifndef RTT_DOWN_BUFFER_CELLS
#define RTT_DOWN_BUFFER_CELLS       (128u)
#endif

#ifndef RTT_MAX_LINE_CHARS
#define RTT_MAX_LINE_CHARS          (80u)
#endif

#ifndef RTT_MAX_COMMAND_CHARS
#define RTT_MAX_COMMAND_CHARS       RTT_MAX_LINE_CHARS
#endif

#define RTT_SECTION_CB_NAME         ".rtt_block"
#define RTT_SECTION_BUF_NAME        ".rtt_buf"

#endif
