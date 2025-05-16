import { AppLeaf } from "app-leaf";
import { ConnectionModule } from "./Features/Connection/ConnectionModule";
import { McpModule } from "./Features/Mcp/McpModule";
import { log } from "console";

AppLeaf.LoadModules([ConnectionModule, McpModule]);
AppLeaf.Start();
log("Mcp started");
