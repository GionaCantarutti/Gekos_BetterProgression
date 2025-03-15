import * as fs from "fs";
import { IDaum } from "@spt/models/eft/itemEvent/IItemEventRouterRequest";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { ILogger } from "@spt/models/spt/utils/ILogger"
import { getModFolder } from "./utils";

export class LoggerWrapper
{
    
    readonly prefix: string;
    readonly logger: ILogger;
    readonly modName: string;
    readonly modVersion: string;
    
    constructor(_logger: ILogger)
    {
        const packageJsonPath = getModFolder() + "/package.json";
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

        this.logger = _logger;
        this.modName = packageJson.name;
        this.modVersion = packageJson.version;
        this.prefix = `[${this.modName}-${this.modVersion}] `;
    }

    public info(message: string): void
    {
        this.logger.info(this.prefix + message);
    }

    writeToLogFile(data: string | IDaum): void
    {
        if (typeof data === "string")
        {
            data += this.prefix
        }
        this.logger.writeToLogFile(data);
    }

    log(data: string | Record<string, unknown> | Error, color: string, backgroundColor?: string): void
    {
        if (typeof data === "string")
        {
            data += this.prefix
        }
        this.logger.log(data, backgroundColor);
    }

    logWithColor(data: string | Record<string, unknown>, textColor: LogTextColor, backgroundColor?: LogBackgroundColor): void
    {
        if (typeof data === "string")
        {
            data += this.prefix
        }
        this.logger.logWithColor(data, textColor, backgroundColor);
    }

    error(data: string): void
    {
        this.logger.error(`${this.prefix}${data}`);
    }

    warning(data: string): void
    {
        this.logger.warning(this.prefix + data);
    }

    success(data: string): void
    {
        this.logger.success(this.prefix + data);
    }

    debug(data: string | Record<string, unknown>, onlyShowInConsole?: boolean): void
    {
        if (typeof data === "string")
        {
            data += this.prefix
        }
        this.logger.debug(data, onlyShowInConsole);
    }

}