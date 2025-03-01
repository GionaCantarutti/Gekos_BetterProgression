import { ITrader } from "@spt/models/eft/common/tables/ITrader";

//Sets the loyalty level of the given sale item on the given trader
//If capToMax is false the loyalty level will be allowed to go beyond 4
export function setLoyalty(itemID: string, loyalty: number, trader: ITrader, capToMax: boolean): void
{
    if (loyalty == null) loyalty = 0;
    const maxLevel = capToMax ? 4 : 999 //Set max level to a dummy value if loyalty > 4 is to be hidden from all trader levels in config
    trader.assort.loyal_level_items[itemID] = Math.max(1, Math.min(maxLevel, Math.floor(loyalty))); //Floor and clamp between 1 and the max level
}

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