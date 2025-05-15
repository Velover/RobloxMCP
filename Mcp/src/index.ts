import { AppLeaf } from "app-leaf";
import { ConnectionModule } from "./Features/Connection/ConnectionModule";
import { McpModule } from "./Features/Mcp/McpModule";

AppLeaf.LoadModules([ConnectionModule, McpModule]);
AppLeaf.Start();
