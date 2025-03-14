import { Context } from "../contex";

export function removeFirFromQuests(context: Context): void
{
    const quests = context.tables.templates.quests;
    const locales = context.tables.locales.global;
    const foundInRaidRegex = new RegExp("Find.*in raid", "i");
    const inRaidRegex = new RegExp("in raid", "i");

    for (const quest of Object.values(quests))
    {
        const sets = [quest.conditions.AvailableForFinish, quest.conditions.AvailableForStart, quest.conditions.Fail, quest.conditions.Started, quest.conditions.Success]

        for (const set of sets)
        {
            if (set == null) continue;

            //Allow handing over of non-FiR items
            for (const cond of set)
            {
                if (cond.conditionType == "HandoverItem" || cond.conditionType === "FindItem")
                {
                    cond.onlyFoundInRaid = false;
                }
            }
        }
    }

    //Change the locales to remove "in raid"
    for (const [lang, locale] of Object.entries(locales)) for (const [key, text] of Object.entries(locale))
    {
        if (foundInRaidRegex.test(text))
        {
            locales[lang][key] = text.replace(inRaidRegex, "");
        }
    }
}

export function removeFirFromFlea(context: Context): void
{
    context.tables.globals.config.RagFair.isOnlyFoundInRaidAllowed = false;
}

export function removeFirFromHideout(context: Context): void
{
    context.logger.warning("FiR from hideout builds removal not yet implemented! Remember to put it in after 3.11 update!");
}