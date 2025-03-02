import { ItemHelper } from "@spt/helpers/ItemHelper";
import { DependencyContainer } from "tsyringe";
import { Context } from "../contex";
import { calculateAmmoLoyalty } from "./ammo";
import { calculateWeaponLoyalty } from "./weapon";
import { isBarterTrade, isQuestLocked, setLoyalty } from "../utils";
import { BaseClasses } from "@spt/models/enums/BaseClasses";

export function algorithmicallyRebalance(container: DependencyContainer, context: Context): void
{
    //Alias
    const config = context.config.algorithmicalRebalancing;

    const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");
    const traders = Object.values(context.tables.traders);

    //Loop over each trader
    for (const trader of traders)
    {
        const loyaltyLevels = trader?.assort?.loyal_level_items;
        if (loyaltyLevels == null) continue;

        const itemsForSale = trader?.assort?.items;
        if (itemsForSale == null) continue;

        for (const item of itemsForSale)
        {
            let loyaltyScore : number = 0;
            let logChange: boolean = false;
            let shouldChange: boolean = false;

            //// AMMO ////
            if (config.ammoRules.enable
                && itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))
            {
                loyaltyScore = calculateAmmoLoyalty(item, context);
                logChange = config.ammoRules.logChanges;
                shouldChange = true;
            }

            //// WEAPONS ////
            if (config.weaponRules.enable
                && itemHelper.isOfBaseclass(item._tpl, BaseClasses.WEAPON)
                && !itemHelper.isOfBaseclass(item._tpl, BaseClasses.SPECIAL_WEAPON)) //ToDo: double check melee and grenades (and possibly other exceptions)
            {
                loyaltyScore = calculateWeaponLoyalty(item, context);
                logChange = config.weaponRules.logChanges;
                shouldChange = true;
            }

            if (shouldChange)
            {
                //Final modifications
                if (isQuestLocked(item, trader)) 
                {
                    loyaltyScore += config.questLockDelta;
                    if (config.logBartersAndLocks) context.logger.info(context.tables.templates.items[item._tpl]._name + " is a quest-locked item\t(Trade ID: " + item._id + ")");
                }
                if (isBarterTrade(item, trader))
                {
                    loyaltyScore += config.barterDelta;
                    if (config.logBartersAndLocks) context.logger.info(context.tables.templates.items[item._tpl]._name + " is a bartered item\t(Trade ID: " + item._id + ")");
                }

                //Apply change
                if (logChange) context.logger.info("Setting " + context.tables.templates.items[item._tpl]._name + " at loyalty level " + loyaltyScore);
                setLoyalty(item._id, loyaltyScore, trader, config.clampToMaxLevel);
            }
            
            
        }

    }
}