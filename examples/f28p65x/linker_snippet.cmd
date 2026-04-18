/* Example only.
 *
 * Define USER_RTT_CB_RAM and USER_RTT_BUF_RAM in the owning
 * project so the shell metadata and ring buffers land in CPU1 RAM that:
 *   1. survives as needed for your debug workflow,
 *   2. is not touched by other modules or DMA,
 *   3. is visible to the active CCS debug session.
 */

SECTIONS
{
   .rtt_block  : > USER_RTT_CB_RAM,  type = NOINIT
   .rtt_buf : > USER_RTT_BUF_RAM, type = NOINIT
}
