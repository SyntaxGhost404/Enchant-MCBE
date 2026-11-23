/**
 * Enchant+ 1.1.1 for Minecraft: Bedrock Edition 26.60+
 * Prices and payment methods. Each payment (Enchant Essence, scoreboard money, XP) can be switched
 * on or off with "state". The amounts below are Enchant prices; a Transfer costs half of them (rounded up)
 * and Disenchant gives back the "refund" share of the XP and money (rounded down). Whether XP and
 * Enchant Essence are charged per enchantment level or once per Enchant/Transfer is chosen per world:
 * world settings -> Behavior Packs -> Enchant+ [ BP ] -> gear button -> "Cost scaling" (default: both per level).
 * Amounts below 0 or that are not numbers count as 0; refund shares are limited to 0-1 (0% to 100%).
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

export const config = {
    items:{
        /**
         * Payment with an item (Enchant Essence).
         * state  : true to take the item, false to switch this payment off
         * id     : identifier of the item that is taken
         * amount : items taken per enchantment level added or moved
         *          (once per Enchant/Transfer when "Cost scaling" uses a flat essence cost)
         * name   : label on the balance panel
         */
        state:true,
        id:'da:enchant_essence',
        amount:3,
        name:'Item Enchant Essence \nAmount'
    },

    scores:{
        /**
         * Payment with scoreboard money (switched off by default).
         * state        : true to take money from a scoreboard objective, false to switch this payment off
         * score_name   : scoreboard objective the money is taken from
         * score_remove : money taken per enchantment level added or moved
         * display_name : name used on the recap screens and in messages
         * refund       : share given back when disenchanting (0.6 = 60%); a Transfer never costs less than this
         * name         : label on the balance panel
         */
        state:false ,
        score_name:'money',
        score_remove:10,
        display_name:'Money',
        refund:0.6,
        name:'Money'
    },

    xp:{
        /**
         * Payment with XP levels.
         * state     : true to take XP levels, false to switch this payment off
         * xp_remove : XP levels taken per enchantment level added or moved
         *             (once per Enchant/Transfer when "Cost scaling" uses a flat XP cost)
         * refund    : share given back when disenchanting (0.5 = half); with a flat XP cost, only when the
         *             Disenchant removes every enchantment. A Transfer never costs less than this refund
         * name      : label on the balance panel
         */
        state:true,
        xp_remove:3,
        refund:0.5,
        name:'XP'
    }

}