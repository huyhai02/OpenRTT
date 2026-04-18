CC      ?= gcc
CFLAGS  ?= -std=c11 -Wall -Wextra -Werror -pedantic
INCLUDES = -I../../firmware/rtt/include -I../../firmware/rtt/src
SOURCES = \
	../../firmware/rtt/src/rtt.c \
	../../firmware/rtt/src/rtt_ringbuf.c \
	../../firmware/rtt/src/rtt_port.c \
	test_rtt.c

all: test_rtt

test_rtt: $(SOURCES)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $(SOURCES)

run: test_rtt
	./test_rtt

clean:
	rm -f test_rtt
