import { OnInit, OnStart } from "@flamework/core";
import { Controller, OnUnload } from "FlameworkIntegration";
import { HttpService, RunService } from "@rbxts/services";
import { atom } from "@rbxts/charm";
import { ConnectionResources } from "../Resources/ConnectionResources";
import { useAtom } from "@rbxts/react-charm";

interface ICommand {
	id: string;
	name: string;
	args: unknown;
	timestamp: number;
}

interface ICommandResponse {
	id: string;
	result: unknown;
	error?: string;
}

@Controller({})
export class ConnectionController implements OnInit, OnStart, OnUnload {
	// Connection state atom for reactive UI updates
	private readonly _connectionStateAtom = atom<ConnectionResources.EConnectionState>(
		ConnectionResources.EConnectionState.DISCONNECTED,
	);

	// Command handlers map
	private readonly _commandHandlers = new Map<string, (args: any) => Promise<any>>();

	// Keep-alive and fetch timers
	private _keepAliveTimer?: RBXScriptConnection;
	private _fetchCommandsTimer?: RBXScriptConnection;

	onInit(): void {
		print("ConnectionController initialized");
	}

	onStart(): void {
		print("Starting connection to MCP server");
		this.StartConnectionLoop();
	}

	onUnload(): void {
		this.StopConnectionLoop();
	}

	// Register a command handler
	public RegisterCommandHandler(commandName: string, handler: (args: any) => Promise<any>): void {
		this._commandHandlers.set(commandName, handler);
	}

	// Unregister a command handler
	public UnregisterCommandHandler(commandName: string): void {
		this._commandHandlers.delete(commandName);
	}

	// Get current connection state
	public GetConnectionState(): ConnectionResources.EConnectionState {
		return this._connectionStateAtom();
	}

	// Get connection state atom (for UI components)
	public useConnectionState(): ConnectionResources.EConnectionState {
		return useAtom(this._connectionStateAtom);
	}

	// Start connection loop
	private StartConnectionLoop(): void {
		// Stop existing timers if they exist
		this.StopConnectionLoop();

		// Start keep-alive timer
		this._keepAliveTimer = RunService.Heartbeat.Connect(() => {
			if (os.clock() % ConnectionResources.KEEP_ALIVE_INTERVAL < 0.1) {
				this.SendKeepAlive();
			}
		});

		// Start fetch commands timer
		this._fetchCommandsTimer = RunService.Heartbeat.Connect(() => {
			if (os.clock() % ConnectionResources.FETCH_COMMANDS_INTERVAL < 0.1) {
				this.FetchCommands();
			}
		});
	}

	// Stop connection loop
	private StopConnectionLoop(): void {
		if (this._keepAliveTimer) {
			this._keepAliveTimer.Disconnect();
			this._keepAliveTimer = undefined;
		}

		if (this._fetchCommandsTimer) {
			this._fetchCommandsTimer.Disconnect();
			this._fetchCommandsTimer = undefined;
		}
	}

	// Send keep-alive request to server
	private SendKeepAlive(): void {
		task.spawn(() => {
			const [success] = pcall(() => {
				HttpService.PostAsync(
					ConnectionResources.BASE_URL + ConnectionResources.KEEP_ALIVE_ENDPOINT,
					"{}",
					Enum.HttpContentType.ApplicationJson,
				);
			});

			if (success) {
				this._connectionStateAtom(ConnectionResources.EConnectionState.CONNECTED);
			} else {
				this._connectionStateAtom(ConnectionResources.EConnectionState.DISCONNECTED);
			}
		});
	}

	// Fetch commands from server
	private FetchCommands(): void {
		if (this.GetConnectionState() !== ConnectionResources.EConnectionState.CONNECTED) {
			return;
		}

		task.spawn(() => {
			const [success, result] = pcall(() => {
				return HttpService.PostAsync(
					ConnectionResources.BASE_URL + ConnectionResources.GET_COMMANDS_ENDPOINT,
					"{}",
					Enum.HttpContentType.ApplicationJson,
				);
			});

			if (!success) {
				print("Failed to fetch commands:", result);
				return;
			}

			const [parseSuccess, data] = pcall(() => HttpService.JSONDecode(result as string));
			if (!parseSuccess || !data.commands) {
				return;
			}

			const commands = data.commands as Array<ICommand>;
			if (commands.size() > 0) {
				this.ProcessCommands(commands);
			}
		});
	}

	// Process commands from server
	private ProcessCommands(commands: Array<ICommand>): void {
		const responses: Array<ICommandResponse> = [];

		for (const command of commands) {
			task.spawn(() => {
				const handler = this._commandHandlers.get(command.name);

				const response: ICommandResponse = {
					id: command.id,
					result: null,
				};

				if (!handler) {
					response.error = `No handler registered for command '${command.name}'`;
					responses.push(response);
					return;
				}

				Promise.try(() => handler(command.args))
					.then((result) => {
						response.result = result;
					})
					.catch((error) => {
						response.error = tostring(error);
					})
					.finally(() => {
						responses.push(response);
						this.SubmitResponses(responses);
					});
			});
		}
	}

	// Submit command responses back to server
	private SubmitResponses(responses: Array<ICommandResponse>): void {
		if (responses.isEmpty()) {
			return;
		}

		const data = {
			responses: responses,
		};

		task.spawn(() => {
			const [success, result] = pcall(() => {
				return HttpService.PostAsync(
					ConnectionResources.BASE_URL + ConnectionResources.SUBMIT_COMMANDS_ENDPOINT,
					HttpService.JSONEncode(data),
					Enum.HttpContentType.ApplicationJson,
				);
			});

			if (!success) {
				print("Failed to submit responses:", result);
			}
		});
	}
}
