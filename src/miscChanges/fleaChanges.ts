import { Context } from "../contex";

export function disableFleaMarket(context: Context): void
{
    const allItems = context.tables.templates.items;
    const config = context.config.fleaMarketChanges;

    for (const [id, item] of Object.entries(allItems))
    {
        const allowed: boolean = config.fleaWhitelist.includes(id);
        item._props.CanRequireOnRagfair = allowed;
        item._props.CanSellOnRagfair = allowed;
    }
}