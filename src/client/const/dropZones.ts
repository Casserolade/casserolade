/**
 * Where a drop lands, by its height on the table (table pixels, 1920×1080), across the whole width:
 * above the counter line, the shop side (a politician dropped there is sold); below it, your side, where
 * what comes from the shop is bought; the board band lays down, the hand band at the bottom gives back.
 * The counter line is the one the fuse burns along (RecruitRope.vue).
 */
export const DROP_ZONES = { counterY: 440, handY: 836, tableHeight: 1080 } as const;
