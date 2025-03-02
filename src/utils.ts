import { IItem } from "@spt/models/eft/common/tables/IItem";
import { IBarterScheme, ITrader } from "@spt/models/eft/common/tables/ITrader";

const currencies: string[] = [
    "5449016a4bdc2d6f028b456f", //Roubles
    "5696686a4bdc2da3298b456a", //Dollars
    "569668774bdc2da2298b4568", //Euroes
    "5d235b4d86f7742e017bc88a", //GP Coin
    "6656560053eaaa7a23349c86"  //Lega medal
]

//Sets the loyalty level of the given sale item on the given trader
//If capToMax is false the loyalty level will be allowed to go beyond 4
export function setLoyalty(itemID: string, loyalty: number, trader: ITrader, capToMax: boolean): void
{
    if (loyalty == null) loyalty = 0;
    const maxLevel = capToMax ? 4 : 999 //Set max level to a dummy value if loyalty > 4 is to be hidden from all trader levels in config
    trader.assort.loyal_level_items[itemID] = Math.max(1, Math.min(maxLevel, Math.floor(loyalty))); //Floor and clamp between 1 and the max level
}

//Checks if the given trade item is offered for barter on the given trader
//Anything that can't be purchased for RUB, EUR, USD, GP or Lega Medals is considered a barter
export function isBarterTrade(trade: IItem, trader: ITrader): boolean
{
    const scheme: IBarterScheme[][] = trader.assort.barter_scheme[trade._id];
    if (scheme == null) return false;

    for (const ask of scheme) for (const ask1 of ask) //Cursed, i know
    {
        if (!currencies.includes(ask1._tpl)) return true;
    }

    return false;
}

//Checks if the given trade item is quest locked on the given trader
export function isQuestLocked(trade: IItem, trader: ITrader): boolean {

    const questLocks = [
        ...Object.keys(trader.questassort["success"]),
        ...Object.keys(trader.questassort["started"]),
        ...Object.keys(trader.questassort["fail"]) ];

    for (const questLockedTrade of questLocks)
    {
        if (trade._id == questLockedTrade) return true;
    }

    return false;

}

//Returns the path to the mod folder
export function getModFolder(): string {
    return "./user/mods/Gekos_BetterProgression";
}

//Returns one of "manual", "semiauto" or "fullauto" depending on which is the best fire mode available between the provided choices
export function bestFiremode(modes: string[], isManual: boolean): string
{

    const ranks: { [mode: string] : number } = 
    {
        "none" : -9999,
        "manual" : 0,
        "doublet" : 1,
        "semiauto" : 1,
        "doubleaction": 1,
        "single" : isManual ? -100 : 1,
        "burst" : 2,
        "fullauto" : 3
    };

    let bestMode: string = "none";

    for (const mode of modes)
    {
        if (ranks[bestMode] < ranks[mode]) bestMode = mode;
    }
    if (isManual) if (ranks[bestMode] < ranks["manual"]) bestMode = "manual";

    //Rename for simplicity
    if (bestMode == "manual" || bestMode == "pumpaction" || (isManual && bestMode == "single")) return "manual";
    if (bestMode == "single" || bestMode == "doubleaction" || bestMode == "doublet") return "semiauto";

    return bestMode;

}