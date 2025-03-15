import { ItemTpl } from "@spt/models/enums/ItemTpl";
import { Context } from "../contex";

export function changeCrafts(context: Context): void
{
    const config = context.config.misc;
    const crafts = context.tables.hideout.production.recipes;
    const nonBtc = crafts.filter((production) => production.endProduct != ItemTpl.BARTER_PHYSICAL_BITCOIN);
    
    for (const craft of nonBtc)
    {
        craft.count *= config.craftProductMultiplier;
        craft.productionTime *= config.craftTimeMultiplier;
    }
}