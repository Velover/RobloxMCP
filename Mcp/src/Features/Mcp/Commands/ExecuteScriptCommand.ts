import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Dependency } from "app-leaf";
import { z } from "zod";
import { ConnectionController } from "../../Connection/Controllers/ConnectionController";
import type { ICommand } from "./ICommand";

export class ExecuteScriptCommand implements ICommand {
  Add(server: McpServer): void {
    server.tool(
      "execute_script",
      "Executes luau script in roblox studio. To get the response use print/warn/error for logging and it is going to be included in response, or use return to get the response directly",
      {
        code: z.string().describe("Luau code to execute"),
      },
      async ({ code }) => {
        const connectionController = Dependency(ConnectionController);
        const jobId = connectionController.RunCommand("execute_script", {
          code,
        });

        const response = connectionController
          .GetResponce(jobId)
          .then((r) => {
            const { output, logs } = r;
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(output, null, 2),
                },
                {
                  type: "text" as const,
                  text: `Logs:\n${logs.join("\n")}`,
                },
              ],
            };
          })
          .catch((r) => {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error executing script: ${r}`,
                },
              ],
            };
          });

        return await response;
      }
    );
  }
}
