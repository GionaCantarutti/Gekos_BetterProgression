import { Context } from "../contex";

export function changeCrafts(context: Context): void
{
    const config = context.config.misc;
    const crafts = context.tables.hideout.production.recipes;
    
    for (const craft of crafts)
    {
        craft.count *= config.craftProductMultiplier;
        craft.productionTime *= config.craftTimeMultiplier;
    }
}