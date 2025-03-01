import { IItem } from "@spt/models/eft/common/tables/IItem";
import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { Context } from "../contex";
import { bestFiremode } from "../utils";

export function calculateWeaponLoyalty(item: IItem, context: Context): number
{
    const config = context.config.algorithmicalRebalancing.weaponRules;
    const tables = context.tables;

    const itemTemplate: ITemplateItem = tables.templates.items[item._tpl];
    const fireMode = bestFiremode(itemTemplate._props.weapFireType, itemTemplate._props.BoltAction || !itemTemplate._props.CanQueueSecondShot);
    const fireRate = itemTemplate._props.bFirerate;
    let loyalty: number = config.defaultBaseLoyalty;

    //Base loyalty level based on caliber
    for (const byCaliber of config.weaponBaseLoyaltyByCaliber)
    {
        if (byCaliber.caliber == itemTemplate._props.ammoCaliber) loyalty = byCaliber.baseLoyalty;
    }

    //Account for best available fire mode
    for (const byMode of config.fireModeRules)
    {
        if (byMode.mode == fireMode) loyalty += byMode.delta;
    }

    //Account for fire rate if applicable
    if (fireMode == "fullauto" || fireMode == "burst") for (const byRate of config.fireRateRules)
    {
        if (fireRate >= byRate.rateInterval[0] && fireRate < byRate.rateInterval[1]) loyalty += byRate.delta;
    }

    return loyalty + config.globalDelta;
}