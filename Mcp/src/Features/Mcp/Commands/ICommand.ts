import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ICommand {
  Add(server: McpServer): void;
}
