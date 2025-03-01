import { ITrader } from "@spt/models/eft/common/tables/ITrader";

export function setLoyalty(itemID: string, loyalty: number, trader: ITrader, capToMax: boolean): void
{
    const maxLevel = capToMax ? 4 : 999 //Set max level to a dummy value if loyalty > 4 is to be hidden from all trader levels in config
    trader.assort.loyal_level_items[itemID] = Math.max(1, Math.min(maxLevel, Math.floor(loyalty))); //Floor and clamp between 1 and the max level
}