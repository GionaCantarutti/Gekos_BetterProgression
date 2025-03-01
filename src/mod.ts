//import JSON5 from "json5";
//import path from "node:path";

import { DependencyContainer } from "tsyringe";

import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { IItem } from "@spt/models/eft/common/tables/IItem";
import { ITrader } from "@spt/models/eft/common/tables/ITrader";
import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
//import { VFS } from "@spt/utils/VFS";

class Mod implements IPostDBLoadMod
{

    //private vfs: VFS;
    private database: DatabaseServer;
    private logger: ILogger;

    // config
    private config = require("../config/config.json");

    /**
     * Loads and parses a config file from disk
     * @param fileName File name inside of config folder to load
     */
    // public loadJsonFile<T>(filePath: string, readAsText = false): T
    // {
    //     const file = path.join(filePath);
    //     const string = this.vfs.readFile(file);

    //     return readAsText 
    //         ? string as T
    //         : JSON5.parse(string) as T;
    // }

    // public preSPTLoad(container: DependencyContainer) {
    //     //this.vfs = container.resolve<VFS>("VFS");
    // }

    public postDBLoad(container: DependencyContainer): void
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.database = container.resolve<DatabaseServer>("DatabaseServer");
        if (this.config.algorithmicalRebalancing.enableAlgorithmicalRebalancing) this.algorithmicallyRebalance(container);
        
    }

    private algorithmicallyRebalance(container: DependencyContainer)
    {
        // Get all the in-memory json found in /assets/database
        const tables: IDatabaseTables = this.database.getTables();

        // Get ItemHelper ready to use
        const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");

        //Get traders
        const traders = Object.values(tables.traders);

        //Loop over each trader
        for (const trader of traders)
        {
            const loyaltyLevels = trader?.assort?.loyal_level_items;
            if (loyaltyLevels == null) continue;

            for (const item in loyaltyLevels)
            {
                //Loyalty levels seem to start at 1 but 0 works all the same (it just won't filter properly)
                loyaltyLevels[item] = 1; //Set all loyalty requirements to 1
            }

            const itemsForSale = trader?.assort?.items;
            if (itemsForSale == null) continue;

            for (const item of itemsForSale)
            {
                if (itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))
                {
                    this.rebalanceAmmunition(item, tables, trader);
                }

            }

        }
    }

    private rebalanceAmmunition(item: IItem, tables: IDatabaseTables, trader: ITrader)
    {

        const config = this.config.algorithmicalRebalancing.ammoRules;

        const itemTemplate: ITemplateItem = tables.templates.items[item._tpl];

        let loyalty: number = 0;

        //Base level from penetration
        for (const rule of config.ammoBaseLoyaltyByPen)
        {
            if (itemTemplate._props.PenetrationPower >= rule.penInterval[0] && itemTemplate._props.PenetrationPower < rule.penInterval[1])
            {
                loyalty = rule.baseLoyalty;
            }
        }
        
        //Modify by caliber
        for (const rule of config.caliberRules)
        {
            if (itemTemplate._props.Caliber == rule.caliber)
            {
                loyalty += rule.loyaltyDelta;
            }
        }

        //Modify by damage (accounting for projectile count)
        for (const rule of config.damageRules)
        {
            const totalDamage = itemTemplate._props.Damage * itemTemplate._props.ProjectileCount;
            if (totalDamage >= rule.damageInterval[0] && totalDamage < rule.damageInterval[1])
            {
                loyalty += rule.loyaltyDelta;
            }
        }

        loyalty += config.globalDelta;

        if (config.logChanges) this.logger.info("Setting " + tables.templates.items[item._tpl]._name + " at loyalty level " + loyalty);
        this.setLoyalty(item._id, loyalty, trader);

    }

    private setLoyalty(itemID: string, loyalty: number, trader: ITrader)
    {
        const maxLevel = this.config.algorithmicalRebalancing.clampToMaxLevel ? 4 : 999 //Set max level to a dummy value if loyalty > 4 is to be hidden from all trader levels in config
        trader.assort.loyal_level_items[itemID] = Math.max(1, Math.min(maxLevel, Math.floor(loyalty))); //Floor and clamp between 1 and the max level
    }
}

export const mod = new Mod();
