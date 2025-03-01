import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";

export class Context
{

    public database: DatabaseServer;
    public tables: IDatabaseTables;
    public logger: ILogger;
    public config;

    constructor(
        _config?: any, /*Not sure how to type this, dynamically type checked languages are weird*/
        _database?: DatabaseServer, _tables?: IDatabaseTables, _logger?: ILogger
    )
    {
        this.database = _database;
        this.tables = _tables;
        this.logger = _logger;
        this.config = _config;
    }

}