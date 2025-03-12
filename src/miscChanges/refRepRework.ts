import { DependencyContainer } from "tsyringe";
import { Context } from "../contex";
import { LocationLifecycleService } from "@spt/services/LocationLifecycleService";
import { IPmcData } from "@spt/models/eft/common/IPmcData";
import { IEndLocalRaidRequestData } from "@spt/models/eft/match/IEndLocalRaidRequestData";
import { IVictim } from "@spt/models/eft/common/tables/IBotBase";

export function gainRefRepOnKill(context: Context, container: DependencyContainer): void
{
    
    container.afterResolution("LocationLifecycleService", (_t, result: LocationLifecycleService) =>
    {
        // We want to replace the original method logic with something different
        const old = (result as any).handlePostRaidPmc.bind(result);
        (result as any).handlePostRaidPmc = (sessionId: string, pmcProfile: IPmcData, scavProfile: IPmcData, isDead: boolean, isSurvived: boolean, isTransfer: boolean, request: IEndLocalRaidRequestData, locationName: string) =>
        {
            old(sessionId, pmcProfile, scavProfile, isDead, isSurvived, isTransfer, request, locationName); //Add old logic back in

            //Filter PMC kills
            const pmcKills = pmcProfile?.Stats.Eft.Victims.filter(
                (victim) => ["pmcbear", "pmcusec"].includes(victim.Role.toLowerCase()));

            pmcProfile.TradersInfo["6617beeaa9cfa777ca915b7c"].standing += repByKills(pmcKills, context);
            
        };
        // The modifier Always makes sure this replacement method is ALWAYS replaced
    }, {frequency: "Always"});

}

function repByKills(pmcKills: IVictim[], context: Context): number
{
    let totalRep: number = 0;

    for (const kill of pmcKills) for (const repRange of context.config.misc.refStandingOnKill.repByKillLevel)
    {
        if (kill.Level >= repRange.levelRange[0] && kill.Level < repRange.levelRange[1]) totalRep += repRange.rep;
    }

    return totalRep;
}