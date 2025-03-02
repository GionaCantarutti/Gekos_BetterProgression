import { ItemHelper } from "@spt/helpers/ItemHelper";
import { DependencyContainer } from "tsyringe";
import { Context } from "../contex";
import { calculateAmmoLoyalty } from "./ammo";
import { calculateWeaponLoyalty } from "./weapon";
import { isBarterTrade, isQuestLocked, loyaltyFromScore, setLoyalty, shareSameNiche } from "../utils";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ITrader } from "@spt/models/eft/common/tables/ITrader";
import { IItem } from "@spt/models/eft/common/tables/IItem";



export function algorithmicallyRebalance(container: DependencyContainer, context: Context): void
{
    class ChangedItem
    {
        trade: IItem; score: number; trader: ITrader; logChange: boolean; isWeapon: boolean;

        constructor(trade, score, trader, logChange, isWeapon)
        {
            this.trade = trade;
            this.score = score;
            this.trader = trader;
            this.logChange = logChange;
            this.isWeapon = isWeapon;
        }
    }

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

    //Shifting system
    //WARNING!!! HORRIBLE CODE AHEAD!!!
    for (const changesInLevel of Object.values(changedItems))
    {
        if (changesInLevel == null || changesInLevel.length == 0) continue;

        const toShift: number[] = [];

        for (let i = 0; i < changesInLevel.length; i++)
        {
            if (toShift.includes(i)) continue;
            if (!changesInLevel[i].isWeapon) continue;
            for (let j = i; j < changesInLevel.length; j++)
            {
                if (toShift.includes(j)) continue;
                if (!changesInLevel[j].isWeapon) continue;

                const a = changesInLevel[i]; const b = changesInLevel[j];

                if (shareSameNiche(a.trade, b.trade, a.trader, b.trader, context))
                {
                    const aPowerLevel = config.weaponRules.upshiftRules.powerLevels[a.trade._tpl];
                    const bPowerLevel = config.weaponRules.upshiftRules.powerLevels[b.trade._tpl];

                    if (aPowerLevel == null || bPowerLevel == null || aPowerLevel == bPowerLevel) continue;

                    if (aPowerLevel < bPowerLevel)
                    {
                        toShift.push(j);
                    }
                    else
                    {
                        toShift.push(i);
                    }
                }

            }
        }

        for (const index of toShift)
        {
            const change = changesInLevel[index];
            change.score += config.weaponRules.upshiftRules.shiftAmount;
            const newLevel = loyaltyFromScore(change.score, config.clampToMaxLevel);
            if (changedItems[newLevel] == null)
            {
                changedItems[newLevel] = [change];
            }
            else
            {
                changedItems[newLevel].push(change); //No need to remove from current level since it won't be read again anyway
            }
        }
        
    }

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