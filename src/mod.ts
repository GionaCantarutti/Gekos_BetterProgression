import fs from "fs";
import JSON5 from "json5";
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { Context } from "./contex";
import { algorithmicallyRebalance } from "./algoRebalancing/core";
import { applySecureContainerChanges } from "./miscChanges/secureContainer";
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { getModFolder } from "./utils";
import { changeStashProgression } from "./miscChanges/stashChanges";
import { disableFleaMarket } from "./miscChanges/fleaChanges";
import { addNewItems } from "./customItems/items";

class Mod implements IPostDBLoadMod, IPreSptLoadMod
{
    // config and context
    //private config = require("../config/config.json");
    private context: Context;
    
    preSptLoad(container: DependencyContainer): void
    {
        this.context = new Context();
        this.context.logger = container.resolve<ILogger>("WinstonLogger");

        //Read config
        const fileContent = fs.readFileSync(getModFolder() + "/config/config.json5", "utf-8");
        this.context.config = JSON5.parse(fileContent);
    }

    public postDBLoad(container: DependencyContainer): void
    {
        this.context.database = container.resolve<DatabaseServer>("DatabaseServer");
        this.context.tables = this.context.database.getTables();

        if (this.context.config.customItems.enable) addNewItems(this.context);

        if (this.context.config.algorithmicalRebalancing.enable) algorithmicallyRebalance(container, this.context);

        //Change stack sizes
        for (const [item, stackSize] of Object.entries(this.context.config.misc.stackSizeOverride as Record<string, number>))
        {
            this.context.tables.templates.items[item]._props.StackMaxSize = stackSize;
        }

        if (this.context.config.secureContainerProgression.enable) applySecureContainerChanges(this.context);
        
        if (this.context.config.stashProgression.enable) changeStashProgression(this.context);

        if (this.context.config.fleaMarketChanges.disableFleaMarket) disableFleaMarket(this.context);
    }
}

export const mod = new Mod();
