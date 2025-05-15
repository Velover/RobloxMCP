import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Controller, OnStart } from "app-leaf";
import { ExecuteScriptCommand } from "../Commands/ExecuteScriptCommand";
import type { ICommand } from "../Commands/ICommand";

@Controller()
export class McpController {
  @OnStart()
  private async Start() {
    const server = new McpServer({
      name: "roblox-mcp-server",
      version: "1.0.0",
    });

    this.AddCommands(server, [new ExecuteScriptCommand()]);
    const transport = new StdioServerTransport();
    server.connect(transport).catch((e) => {
      console.error("Error connecting to transport:", e);
      process.exit(1);
    });
  }

  private AddCommands(server: McpServer, commands: ICommand[]) {
    for (const command of commands) {
      command.Add(server);
    }
  }
}
