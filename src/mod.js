"use strict";
//import JSON5 from "C:/snapshot/project/node_modules/json5";
//import path from "node:path";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mod = void 0;
const BaseClasses_1 = require("C:/snapshot/project/obj/models/enums/BaseClasses");
//import { VFS } from "C:/snapshot/project/obj/utils/VFS";
class Mod {
    //private vfs: VFS;
    database;
    logger;
    // config
    config = require("../config/config.json");
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
    postDBLoad(container) {
        this.logger = container.resolve("WinstonLogger");
        this.database = container.resolve("DatabaseServer");
        if (this.config.algorithmicalRebalancing.enableAlgorithmicalRebalancing)
            this.algorithmicallyRebalance(container);
    }
    algorithmicallyRebalance(container) {
        // Get all the in-memory json found in /assets/database
        const tables = this.database.getTables();
        // Get ItemHelper ready to use
        const itemHelper = container.resolve("ItemHelper");
        //Get traders
        const traders = Object.values(tables.traders);
        //Loop over each trader
        for (const trader of traders) {
            const loyaltyLevels = trader?.assort?.loyal_level_items;
            if (loyaltyLevels == null)
                continue;
            for (const item in loyaltyLevels) {
                //Loyalty levels seem to start at 1 but 0 works all the same (it just won't filter properly)
                loyaltyLevels[item] = 1; //Set all loyalty requirements to 1
            }
            const itemsForSale = trader?.assort?.items;
            if (itemsForSale == null)
                continue;
            for (const item of itemsForSale) {
                if (itemHelper.isOfBaseclass(item._tpl, BaseClasses_1.BaseClasses.AMMO)) {
                    this.rebalanceAmmunition(item, tables, trader);
                }
            }
        }
    }
    rebalanceAmmunition(item, tables, trader) {
        const config = this.config.algorithmicalRebalancing.ammoRules;
        const itemTemplate = tables.templates.items[item._tpl];
        let loyalty = 0;
        //Base level from penetration
        for (const rule of config.ammoBaseLoyaltyByPen) {
            if (itemTemplate._props.PenetrationPower >= rule.penInterval[0] && itemTemplate._props.PenetrationPower < rule.penInterval[1]) {
                loyalty = rule.baseLoyalty;
            }
        }
        //Modify by caliber
        for (const rule of config.caliberRules) {
            if (itemTemplate._props.Caliber == rule.caliber) {
                loyalty += rule.loyaltyDelta;
            }
        }
        //Modify by damage (accounting for projectile count)
        for (const rule of config.damageRules) {
            const totalDamage = itemTemplate._props.Damage * itemTemplate._props.ProjectileCount;
            if (totalDamage >= rule.damageInterval[0] && totalDamage < rule.damageInterval[1]) {
                loyalty += rule.loyaltyDelta;
            }
        }
        if (config.logChanges)
            this.logger.info("Setting " + tables.templates.items[item._tpl]._name + " at loyalty level " + loyalty);
        this.setLoyalty(item._id, loyalty, trader);
    }
    setLoyalty(itemID, loyalty, trader) {
        const maxLevel = this.config.algorithmicalRebalancing.clampToMaxLevel ? 4 : 999; //Set max level to a dummy value if loyalty > 4 is to be hidden from all trader levels in config
        trader.assort.loyal_level_items[itemID] = Math.max(1, Math.min(maxLevel, Math.floor(loyalty))); //Floor and clamp between 1 and the max level
    }
}
exports.mod = new Mod();
//# sourceMappingURL=mod.js.map