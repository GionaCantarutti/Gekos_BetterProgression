import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { Context } from "../contex";
import fs from "fs";
import JSON5 from "json5";
import { getModFolder } from "../utils";
import { IQuestReward } from "@spt/models/eft/common/tables/IQuest";

export function applySecureContainerChanges(context: Context): void
{

    //Read secure container config
    const fileContent = fs.readFileSync(getModFolder() + "/config/advanced/secureChanges.json5", "utf-8");
    const secureConfig = JSON5.parse(fileContent);

    //Change container grids
    for (const container of Object.keys(secureConfig.GridChanges))
    {
        const containerItem = context.tables.templates.items[container];
        containerItem._props.GridLayoutName = secureConfig.GridChanges[container].GridLayoutName;
        containerItem._props.Grids = secureConfig.GridChanges[container].Grids;
    }

    //Add containers as quest rewards
    for (const [condition, questsWithRewards] of Object.entries(secureConfig.AdditionalQuestRewards))
    {
        for (const [quest, extraReward] of Object.entries(questsWithRewards))
        {
            if (condition == "Success") context.tables.templates.quests[quest].rewards.Success.push(extraReward as IQuestReward);
            if (condition == "Started") context.tables.templates.quests[quest].rewards.Started.push(extraReward as IQuestReward);
        }
    }

    //Start with Waist Pouch
    const profileTemplates = context.tables.templates.profiles
    for (const profile of Object.values(profileTemplates))
    {
        const bearContainer = profile.bear.character.Inventory.items.find((x) => x.slotId === "SecuredContainer")
        if (bearContainer)
        {
            bearContainer._tpl = context.config.misc.secureContainerProgression.starterContainer;
        }
        const usecContainer = profile.usec.character.Inventory.items.find((x) => x.slotId === "SecuredContainer")
        if (usecContainer)
        {
            usecContainer._tpl = context.config.misc.secureContainerProgression.starterContainer;
        }
    }
    
}