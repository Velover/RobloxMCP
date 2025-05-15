#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs } from "fs";
import { z } from "zod";

// Define the file path
const FILE_PATH = "C:/Projects/TS/Tests/McpTest/ai-data.txt";

// Create an MCP server
const server = new McpServer({
  name: "file-io-server",
  version: "1.0.0",
});

// 1. Write to file tool
server.tool(
  "write_to_file",
  "writes to ai-data.txt",
  {
    text: z.string().describe("Text content to write to ai-data.txt"),
  },
  async ({ text }) => {
    try {
      await fs.writeFile(FILE_PATH, text, "utf-8");
      console.error(`Successfully wrote to ${FILE_PATH}`); // Logs to stderr
      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote ${text.length} characters to ai-data.txt`,
          },
        ],
      };
    } catch (error) {
      console.error(`Error writing to file: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: `Error writing to file: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 2. Read from file tool
server.tool("read_from_file", "reads the ai-data.txt", {}, async () => {
  try {
    const fileExists = await fs
      .access(FILE_PATH)
      .then(() => true)
      .catch(() => false);
    if (!fileExists) {
      return {
        content: [
          {
            type: "text",
            text: "The file ai-data.txt does not exist yet. Use write_to_file first.",
          },
        ],
      };
    }

    const content = await fs.readFile(FILE_PATH, "utf-8");
    console.error(`Successfully read from ${FILE_PATH}`); // Logs to stderr
    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  } catch (error) {
    console.error(`Error reading file: ${error}`);
    return {
      content: [
        {
          type: "text",
          text: `Error reading file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File I/O MCP Server is running via STDIO transport");
}

main().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
