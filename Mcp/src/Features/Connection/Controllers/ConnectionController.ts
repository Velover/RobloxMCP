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
    Bun.serve({
      port: Config.PORT,
      routes: {
        [ConnectionResources.KEEP_ALIVE_ENDPOINT]: {
          POST: this.HandleKeepAlive.bind(this),
        },
        [ConnectionResources.GET_COMMANDS_ENDPOINT]: {
          POST: this.HandleGetCommands.bind(this),
        },
        [ConnectionResources.SUBMIT_COMMANDS_ENDPOINT]: {
          POST: this.HandleSubmitCommands.bind(this),
        },
      },
    });

    // Start a periodic cleanup task
    setInterval(
      this.CleanupStaleTasks.bind(this),
      ConnectionResources.CLEANUP_INTERVAL_MS
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

    return id;
  }

  /**
   * Get the response for a command by ID
   * @param id Command ID
   * @returns Promise resolving to the command response
   */
  public async GetResponce(id: ConnectionResources.StringId): Promise<any> {
    if (this._commandResponses.has(id)) {
      const response = this._commandResponses.get(id);
      this._commandResponses.delete(id);
      return response?.result;
    }

    if (!this._activeCommandsMap.has(id)) {
      throw new Error(`Command with ID ${id} not found`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._pendingResultsMap.has(id)) {
          this._pendingResultsMap
            .get(id)
            ?.reject(new Error(`Command ${id} timed out`));
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
        }
      }

      return true;
    }

    if (this._commandResponses.has(id)) {
      this._commandResponses.delete(id);
      return true;
    }

    return false;
  }

  private HandleKeepAlive() {
    this._lastKeepAliveTimestamp = Date.now();
    this._connectionState = ConnectionResources.EConnectionState.CONNECTED;

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
    // Check if connection is still alive
    if (
      Date.now() - this._lastKeepAliveTimestamp >
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS
    ) {
      this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;
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

    return new Response(JSON.stringify({ commands }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async HandleSubmitCommands(req: Request) {
    // Check if connection is still alive
    if (
      Date.now() - this._lastKeepAliveTimestamp >
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS
    ) {
      this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;
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

      for (const response of body.responses) {
        const { id, result, error } = response;

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
            } else {
              pending.resolve(result);
            }
            this._pendingResultsMap.delete(id);
          }
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
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

    // Clean up old responses (older than 5 minutes)
    for (const [id, response] of this._commandResponses.entries()) {
      const isExpired =
        now - response.timestamp > ConnectionResources.MAX_RESPONSE_LIFETIME_MS;
      if (!isExpired) continue;
      this._commandResponses.delete(id);
    }

    for (const [id, command] of this._activeCommandsMap.entries()) {
      const isStale =
        now - command.timestamp > ConnectionResources.MAX_REQUEST_TIME_MS;
      if (!isStale) continue;
      this._activeCommandsMap.delete(id);

      // Also reject any pending promises
      if (this._pendingResultsMap.has(id)) {
        const pending = this._pendingResultsMap.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Command ${id} expired during cleanup`));
          this._pendingResultsMap.delete(id);
        }
      }
    }

    // Check connection state - FIX: Logic was inverted
    const isActive =
      now - this._lastKeepAliveTimestamp <
      ConnectionResources.KEEP_ALIVE_LIFETIME_MS;
    if (isActive) return;
    this._connectionState = ConnectionResources.EConnectionState.DISCONNECTED;
  }
}
