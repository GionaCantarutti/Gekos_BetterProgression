import { IItem } from "@spt/models/eft/common/tables/IItem";
import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { Context } from "../contex";
import { bestFiremode, loyaltyFromScore, pickBestFiremode, shareSameNiche } from "../utils";
import { ChangedItem } from "./types";

export function calculateWeaponLoyalty(item: IItem, context: Context): number
{
    const config = context.config.algorithmicalRebalancing.weaponRules;
    const tables = context.tables;

    const itemTemplate: ITemplateItem = tables.templates.items[item._tpl];
    const fireMode = bestFiremode(itemTemplate);
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

export function weaponShifting(changedItems: { [level: number] : ChangedItem[] }, context: Context): void
{

    const config = context.config.algorithmicalRebalancing;
    const reverse = config.weaponRules.upshiftRules.shiftDownInstead;

    //Shifting system
    //WARNING!!! HORRIBLE CODE AHEAD!!!
    const keys = Object.keys(changedItems).sort();
    for (let i = 0; i < keys.length; i++)
    {
        const index = reverse ? keys.length - i - 1 : i; //Reverse order
        const changesInLevel = changedItems[keys[index]];

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
                        toShift.push(reverse ? i : j);
                    }
                    else
                    {
                        toShift.push(reverse ? j : i);
                    }
                }

            }
        }

        for (const index of toShift)
        {
            const change = changesInLevel[index];
            change.score += config.weaponRules.upshiftRules.shiftAmount * (reverse ? -1 : 1);
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
}