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

    /* Example: echo every received character back to host. */
    (void)rtt_write_char(ch);
}

int main(void) {
    app_init();

    for (;;) {
        app_handle_host_input();
    }
}
