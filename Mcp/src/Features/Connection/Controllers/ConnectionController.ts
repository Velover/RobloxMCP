import { Controller, OnStart } from "app-leaf";
import { Config } from "../../../Core/Config";
import { ConnectionResources } from "../Resources/ConnectionResources";

interface ICommand {
  id: ConnectionResources.StringId;
  name: string;
  args: any;
  timestamp: number;
}

interface ICommandResponse {
  id: ConnectionResources.StringId;
  result: any;
  error?: string;
  timestamp: number;
}

@Controller()
export class ConnectionController {
  private _lastKeepAliveTimestamp = 0;
  private _connectionState: ConnectionResources.EConnectionState =
    ConnectionResources.EConnectionState.DISCONNECTED;
  private _debugMode = false;

  private _activeCommandsMap = new Map<
    ConnectionResources.StringId,
    ICommand
  >();

  private _pendingResultsMap = new Map<
    ConnectionResources.StringId,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  // Map of command ID to response (completed commands)
  private _commandResponses = new Map<
    ConnectionResources.StringId,
    ICommandResponse
  >();

  @OnStart()
  private Start() {
    // Initialize debug mode from config if available
    this._debugMode = Config.DEBUG_MODE ?? false;

    if (this._debugMode) {
      console.log("[ConnectionController] Starting in DEBUG mode");
    }

    Bun.serve({
      port: Config.PORT,
      routes: {
        [ConnectionResources.KEEP_ALIVE_ENDPOINT]: {
          POST: this.HandleKeepAlive.bind(this),
        },
        [ConnectionResources.GET_COMMANDS_ENDPOINT]: {
          GET: this.HandleGetCommands.bind(this),
        },
        [ConnectionResources.SUBMIT_COMMANDS_ENDPOINT]: {
          POST: this.HandleSubmitCommands.bind(this),
        },
      },
    });

    if (this._debugMode) {
      console.log(
        `[ConnectionController] Server started on port ${Config.PORT}`
      );
    }

    // Start a periodic cleanup task
    setInterval(
      this.CleanupStaleTasks.bind(this),
      ConnectionResources.CLEANUP_INTERVAL_MS
    );
  }

  /**
   * Set debug mode on/off
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
    console.log(
      `[ConnectionController] Debug mode ${enabled ? "enabled" : "disabled"}`
    );
  }

  private GenerateId(): ConnectionResources.StringId {
    return crypto.randomUUID();
  }

  /**
   * Run a command and return its ID
   * @param name Command name
   * @param args Command arguments
   * @returns Command ID
   */
  public RunCommand(name: string, args: any): ConnectionResources.StringId {
    const id = this.GenerateId();
    const command: ICommand = {
      id,
      name,
      args,
      timestamp: Date.now(),
    };

    this._activeCommandsMap.set(id, command);

    if (this._debugMode) {
      console.log(
        `[ConnectionController] Command registered - ID: ${id}, Name: ${name}`,
        { args }
      );
    }

    return id;
  }

  /**
   * Get the response for a command by ID
   * @param id Command ID
   * @returns Promise resolving to the command response
   */
  public async GetResponce(id: ConnectionResources.StringId): Promise<any> {
    if (this._debugMode) {
      console.log(
        `[ConnectionController] Getting response for command ID: ${id}`
      );
    }

    if (this._commandResponses.has(id)) {
      const response = this._commandResponses.get(id);
      this._commandResponses.delete(id);

      if (this._debugMode) {
        console.log(
          `[ConnectionController] Found cached response for ID: ${id}`,
          { result: response?.result }
        );
      }

      return response?.result;
    }

    if (!this._activeCommandsMap.has(id)) {
      const errorMsg = `Command with ID ${id} not found`;
      if (this._debugMode) {
        console.error(`[ConnectionController] ${errorMsg}`);
      }
      throw new Error(errorMsg);
    }

    if (this._debugMode) {
      console.log(`[ConnectionController] Waiting for response for ID: ${id}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._pendingResultsMap.has(id)) {
          const errorMsg = `Command ${id} timed out`;
          if (this._debugMode) {
            console.error(`[ConnectionController] ${errorMsg}`);
          }

          this._pendingResultsMap.get(id)?.reject(new Error(errorMsg));
          this._pendingResultsMap.delete(id);
          this._activeCommandsMap.delete(id);
        }
      }, ConnectionResources.MAX_REQUEST_TIME_MS);

      this._pendingResultsMap.set(id, { resolve, reject, timeout });
    });
  }

  /**
   * Cancel a command by ID
   * @param id Command ID
   * @returns true if command was found and canceled, false otherwise
   */
  public CancelCommand(id: ConnectionResources.StringId): boolean {
    if (this._debugMode) {
      console.log(
        `[ConnectionController] Attempting to cancel command ID: ${id}`
      );
    }

    // If command is active, remove it
    if (this._activeCommandsMap.has(id)) {
      this._activeCommandsMap.delete(id);

      // If there's a pending result, reject it
      if (this._pendingResultsMap.has(id)) {
        const pending = this._pendingResultsMap.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("Command canceled"));
          this._pendingResultsMap.delete(id);

          if (this._debugMode) {
            console.log(
              `[ConnectionController] Canceled active command ID: ${id}`
            );
          }
        }
      }

      return true;
    }

    if (this._commandResponses.has(id)) {
      this._commandResponses.delete(id);

      if (this._debugMode) {
        console.log(
          `[ConnectionController] Removed completed command response ID: ${id}`
        );
      }

      return true;
    }

    if (this._debugMode) {
      console.log(
        `[ConnectionController] Command ID: ${id} not found for cancellation`
      );
    }

    return false;
  }

  private HandleKeepAlive() {
    this._lastKeepAliveTimestamp = Date.now();
    this._connectionState = ConnectionResources.EConnectionState.CONNECTED;

    if (this._debugMode) {
      console.log(
        `[ConnectionController] Keep-alive request received at ${new Date().toISOString()}`
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: this._lastKeepAliveTimestamp,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private HandleGetCommands() {
    if (this._debugMode) {
      console.log(
        `[ConnectionController] Get-commands request received at ${new Date().toISOString()}`
      );
    }

    // Check if connection is still alive
    if (
      Date.now() - this._lastKeepAliveTimestamp >
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS
    ) {
      this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;

      if (this._debugMode) {
        console.warn(
          `[ConnectionController] Connection expired during get-commands request`
        );
      }

      return new Response(
        JSON.stringify({
          error: "Connection expired. Send a keep-alive request first.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Convert active commands to an array
    const commands = Array.from(this._activeCommandsMap.values());

    if (this._debugMode) {
      console.log(
        `[ConnectionController] Sending ${commands.length} commands to client`
      );
    }

    return new Response(JSON.stringify({ commands }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async HandleSubmitCommands(req: Request) {
    if (this._debugMode) {
      console.log(
        `[ConnectionController] Submit-commands request received at ${new Date().toISOString()}`
      );
    }

    // Check if connection is still alive
    if (
      Date.now() - this._lastKeepAliveTimestamp >
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS
    ) {
      this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;

      if (this._debugMode) {
        console.warn(
          `[ConnectionController] Connection expired during submit-commands request`
        );
      }

      return new Response(
        JSON.stringify({
          error: "Connection expired. Send a keep-alive request first.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const body = (await req.json()) as { responses: ICommandResponse[] };

      if (!Array.isArray(body.responses)) {
        if (this._debugMode) {
          console.error(
            `[ConnectionController] Invalid submit-commands request format`
          );
        }

        return new Response(
          JSON.stringify({
            error: "Invalid request format. Expected 'responses' array.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (this._debugMode) {
        console.log(
          `[ConnectionController] Processing ${body.responses.length} command responses`
        );
      }

      for (const response of body.responses) {
        const { id, result, error } = response;

        if (this._debugMode) {
          console.log(
            `[ConnectionController] Processing response for command ID: ${id}`,
            { result, error }
          );
        }

        // Store response
        this._commandResponses.set(id, {
          id,
          result,
          error,
          timestamp: Date.now(),
        });

        // Remove from active commands
        this._activeCommandsMap.delete(id);

        // Resolve pending promise if any
        if (this._pendingResultsMap.has(id)) {
          const pending = this._pendingResultsMap.get(id);
          if (pending) {
            clearTimeout(pending.timeout);
            if (error) {
              pending.reject(new Error(error));
              if (this._debugMode) {
                console.error(
                  `[ConnectionController] Command ${id} failed with error: ${error}`
                );
              }
            } else {
              pending.resolve(result);
              if (this._debugMode) {
                console.log(
                  `[ConnectionController] Command ${id} resolved successfully`
                );
              }
            }
            this._pendingResultsMap.delete(id);
          }
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (this._debugMode) {
        console.error(
          `[ConnectionController] Error processing submitted commands:`,
          error
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to process submitted commands",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Clean up stale commands and responses
  private CleanupStaleTasks() {
    const now = Date.now();
    let cleanedResponses = 0;
    let cleanedCommands = 0;

    // Clean up old responses (older than 5 minutes)
    for (const [id, response] of this._commandResponses.entries()) {
      const isExpired =
        now - response.timestamp > ConnectionResources.MAX_RESPONSE_LIFETIME_MS;
      if (!isExpired) continue;
      this._commandResponses.delete(id);
      cleanedResponses++;
    }

    for (const [id, command] of this._activeCommandsMap.entries()) {
      const isStale =
        now - command.timestamp > ConnectionResources.MAX_REQUEST_TIME_MS;
      if (!isStale) continue;
      this._activeCommandsMap.delete(id);
      cleanedCommands++;

      // Also reject any pending promises
      if (this._pendingResultsMap.has(id)) {
        const pending = this._pendingResultsMap.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Command ${id} expired during cleanup`));
          this._pendingResultsMap.delete(id);

          if (this._debugMode) {
            console.warn(
              `[ConnectionController] Cleaned up stale command ID: ${id}`
            );
          }
        }
      }
    }

    if (this._debugMode && (cleanedResponses > 0 || cleanedCommands > 0)) {
      console.log(
        `[ConnectionController] Cleanup: removed ${cleanedResponses} responses and ${cleanedCommands} commands`
      );
    }

    // Check connection state - FIX: Logic was inverted
    const isActive =
      now - this._lastKeepAliveTimestamp <
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS;
    if (isActive) return;

    if (
      this._connectionState ===
        ConnectionResources.EConnectionState.CONNECTED &&
      this._debugMode
    ) {
      console.warn(
        `[ConnectionController] Connection state changed to DISCONNECTED due to keep-alive timeout`
      );
    }

    this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;
  }
}
