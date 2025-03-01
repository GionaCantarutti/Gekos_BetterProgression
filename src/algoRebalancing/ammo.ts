import { IItem } from "@spt/models/eft/common/tables/IItem";
import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";

export function calculateAmmoLoyalty(item: IItem, tables: IDatabaseTables, config: any): number
{

    const itemTemplate: ITemplateItem = tables.templates.items[item._tpl];

    let loyalty: number = 0;

    //Base level from penetration
    for (const rule of config.ammoBaseLoyaltyByPen)
    {
        if (itemTemplate._props.PenetrationPower >= rule.penInterval[0] && itemTemplate._props.PenetrationPower < rule.penInterval[1])
        {
            loyalty = rule.baseLoyalty;
        }
    }
    
    //Modify by caliber
    for (const rule of config.caliberRules)
    {
        if (itemTemplate._props.Caliber == rule.caliber)
        {
            loyalty += rule.loyaltyDelta;
        }
    }

    //Modify by damage (accounting for projectile count)
    for (const rule of config.damageRules)
    {
        const totalDamage = itemTemplate._props.Damage * itemTemplate._props.ProjectileCount;
        if (totalDamage >= rule.damageInterval[0] && totalDamage < rule.damageInterval[1])
        {
            loyalty += rule.loyaltyDelta;
        }
    }

    loyalty += config.globalDelta;

    return loyalty;

}