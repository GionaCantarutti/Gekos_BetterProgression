import fs from "fs";
import JSON5 from "json5";
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { Context } from "./contex";
import { algorithmicallyRebalance } from "./algoRebalancing/core";
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { getModFolder } from "./utils";

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

        if (this.context.config.algorithmicalRebalancing.enable) algorithmicallyRebalance(container, this.context);
        
    }
}

export const mod = new Mod();
