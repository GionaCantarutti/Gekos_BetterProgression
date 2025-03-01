import { DependencyContainer } from "tsyringe";

import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { Context } from "./contex";
import { algorithmicallyRebalance } from "./algoRebalancing/core";

class Mod implements IPostDBLoadMod
{
    // config and context
    private config = require("../config/config.json");
    private context: Context;

    public postDBLoad(container: DependencyContainer): void
    {
        this.context = new Context(
            this.config,
            container.resolve<DatabaseServer>("DatabaseServer"),
            null,
            container.resolve<ILogger>("WinstonLogger")
        );
        this.context.tables = this.context.database.getTables();

        if (this.config.algorithmicalRebalancing.enableAlgorithmicalRebalancing) algorithmicallyRebalance(container, this.context);
        
    }
}

export const mod = new Mod();
