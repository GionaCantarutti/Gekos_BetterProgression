import { ItemHelper } from "@spt/helpers/ItemHelper";
import { DependencyContainer } from "tsyringe";
import { Context } from "../contex";
import { calculateAmmoLoyalty } from "./ammo";
import { calculateWeaponLoyalty, weaponShifting as shiftWeapons } from "./weapon";
import { isBarterTrade, isQuestLocked, loyaltyFromScore, setLoyalty, shareSameNiche } from "../utils";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ITrader } from "@spt/models/eft/common/tables/ITrader";
import { IItem } from "@spt/models/eft/common/tables/IItem";
import { ChangedItem } from "./types";

export function algorithmicallyRebalance(container: DependencyContainer, context: Context): void
{
    //Alias
    const config = context.config.algorithmicalRebalancing;

    const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");
    const traders = Object.values(context.tables.traders);

    //Organize changed items by loyalty level so that they can be easily accessed by the shifting system
    //[trade, loyaltyScore, trader, logChanges][index][loyaltyLevel]
    const changedItems: { [level: number] : ChangedItem[] } = {};

    //Loop over each trader
    for (const trader of traders)
    {
        const loyaltyLevels = trader?.assort?.loyal_level_items;
        if (loyaltyLevels == null) continue;

        const itemsForSale = trader?.assort?.items;
        if (itemsForSale == null) continue;

        if (config.excludeTraders.includes(trader.base._id)) continue;

        for (const item of itemsForSale)
        {
            let thisItem: ChangedItem;

            //// AMMO ////
            if (config.ammoRules.enable
                && itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))
            {
                const loyaltyScore = calculateAmmoLoyalty(item, context);

                thisItem = new ChangedItem(
                    item,
                    loyaltyScore,
                    trader,
                    config.ammoRules.logChanges,
                    false
                );
            }

            //// WEAPONS ////
            if (config.weaponRules.enable
                && itemHelper.isOfBaseclass(item._tpl, BaseClasses.WEAPON)
                && !itemHelper.isOfBaseclass(item._tpl, BaseClasses.SPECIAL_WEAPON)) //ToDo: double check melee and grenades (and possibly other exceptions)
            {
                const loyaltyScore = calculateWeaponLoyalty(item, context);

                thisItem = new ChangedItem(
                    item,
                    loyaltyScore,
                    trader,
                    config.weaponRules.logChanges,
                    true
                );
            }

            if (thisItem != null) //If item is being affected by the mod
            {
                //Final modifications
                if (isQuestLocked(item, trader)) 
                {
                    thisItem.score += config.questLockDelta;
                    if (config.logBartersAndLocks) context.logger.info(context.tables.templates.items[item._tpl]._name + " is a quest-locked item\t(Trade ID: " + item._id + ")");
                }
                if (isBarterTrade(item, trader))
                {
                    thisItem.score += config.barterDelta;
                    if (config.logBartersAndLocks) context.logger.info(context.tables.templates.items[item._tpl]._name + " is a bartered item\t(Trade ID: " + item._id + ")");
                }

                const level = loyaltyFromScore(thisItem.score, config.clampToMaxLevel);
                if (changedItems[level] == null)
                {
                    changedItems[level] = [thisItem];
                }
                else
                {
                    changedItems[level].push(thisItem);
                }

            }
            
        }

    }

    if (config.weaponRules.upshiftRules.enable) shiftWeapons(changedItems, context);

    //Apply changes
    for (const changesInLevel of Object.values(changedItems))
    {
        if (changesInLevel == null || changesInLevel.length == 0) continue;
        for (const changedItem of changesInLevel)
        {
            if (changedItem.logChange) context.logger.info(`Setting ${context.tables.templates.items[changedItem.trade._tpl]._name} at loyalty level ${loyaltyFromScore(changedItem.score, config.clampToMaxLevel)} (${changedItem.score})`);
            setLoyalty(changedItem.trade._id, changedItem.score, changedItem.trader, config.clampToMaxLevel);
        }
    }
}