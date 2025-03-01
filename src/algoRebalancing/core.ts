import { ItemHelper } from "@spt/helpers/ItemHelper";
import { DependencyContainer } from "tsyringe";
import { Context } from "../contex";
import { calculateAmmoLoyalty } from "./ammo";
import { setLoyalty } from "../utils";
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

        for (const item in loyaltyLevels)
        {
            //Loyalty levels seem to start at 1 but 0 works all the same (it just won't filter properly)
            loyaltyLevels[item] = 1; //Set all loyalty requirements to 1 for debugging
        }

        const itemsForSale = trader?.assort?.items;
        if (itemsForSale == null) continue;

        for (const item of itemsForSale)
        {
            if (config.ammoRules.enable && itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))
            {
                const newLoyalty = calculateAmmoLoyalty(item, context.tables, config.ammoRules);
                if (config.ammoRules.logChanges) context.logger.info("Setting " + context.tables.templates.items[item._tpl]._name + " at loyalty level " + newLoyalty);
                setLoyalty(item._id, newLoyalty, trader, config.clampToMaxLevel);
            }

        }

    }
}