import { OnInit, OnStart } from "@flamework/core";
import { atom, peek } from "@rbxts/charm";
import { useAtom } from "@rbxts/react-charm";
import { HttpService } from "@rbxts/services";
import { Controller, OnUnload } from "FlameworkIntegration";
import { ConnectionResources } from "../Resources/ConnectionResources";
import { CallbackTimer } from "../Utils/CallbackTimer";

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

interface IIncommingCommands {
	commands: Array<ICommand>;
}

interface IOutgoingCommands {
	responses: Array<ICommandResponse>;
}

@Controller({})
export class ConnectionController implements OnInit, OnStart, OnUnload {
	// Connection state atom for reactive UI updates
	private readonly _connectionStateAtom = atom<ConnectionResources.EConnectionState>(
		ConnectionResources.EConnectionState.DISCONNECTED,
	);

	// Command handlers map
	private readonly _commandHandlers = new Map<string, (args: unknown) => Promise<unknown>>();

	private _keepAliveTimer = CallbackTimer.Builder()
		.WithWaitTime(ConnectionResources.KEEP_ALIVE_INTERVAL)
		.WithOneShot(false)
		.WithYieldAfterCall(true)
		.WithTimeOutCallback(() => this.SendKeepAlive())
		.Build();

	private _fetchCommandsTimer = CallbackTimer.Builder()
		.WithWaitTime(ConnectionResources.FETCH_COMMANDS_INTERVAL)
		.WithOneShot(false)
		.WithTimeOutCallback(() => this.FetchCommands())
		.WithYieldAfterCall(true)
		.Build();

	onInit(): void {
		print("ConnectionController initialized");
	}

	onStart(): void {
		print("ConnectionController ready - waiting for manual connection");
		// Manual connection is now required - removed auto-connection
	}

	onUnload(): void {
		this.StopConnectionLoop();
	}

	// Register a command handler
	public RegisterCommandHandler(
		commandName: string,
		handler: (args: unknown) => Promise<unknown>,
	): void {
		this._commandHandlers.set(commandName, handler);
	}

	// Unregister a command handler
	public UnregisterCommandHandler(commandName: string): void {
		this._commandHandlers.delete(commandName);
	}

	// Get current connection state
	public PeekConnectionState(): ConnectionResources.EConnectionState {
		return peek(this._connectionStateAtom);
	}

	// Get connection state atom (for UI components)
	public useConnectionState(): ConnectionResources.EConnectionState {
		return useAtom(this._connectionStateAtom);
	}

	// Public method to manually start connection
	public Connect(): void {
		if (this.PeekConnectionState() !== ConnectionResources.EConnectionState.DISCONNECTED) {
			return; // Already connecting or connected
		}

		this._connectionStateAtom(ConnectionResources.EConnectionState.CONNECTING);
		this.StartConnectionLoop();

		// Attempt initial keep-alive to establish connection
		task.spawn(() => this.SendKeepAlive());
	}

	// Public method to manually disconnect
	public Disconnect(): void {
		this.StopConnectionLoop();
		this._connectionStateAtom(ConnectionResources.EConnectionState.DISCONNECTED);
	}

	// Start connection loop
	private StartConnectionLoop(): void {
		this._keepAliveTimer.Start();
		this._fetchCommandsTimer.Start();
	}

	// Stop connection loop
	private StopConnectionLoop(): void {
		this._keepAliveTimer.Stop();
		this._fetchCommandsTimer.Stop();
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
				return;
			}
			// Auto-disconnect on failure
			this.Disconnect();
		});
	}

	// Fetch commands from server
	private FetchCommands(): void {
		if (this.PeekConnectionState() !== ConnectionResources.EConnectionState.CONNECTED) {
			return;
		}

		task.spawn(() => {
			const [success, result] = pcall(() => {
				return HttpService.GetAsync(
					ConnectionResources.BASE_URL + ConnectionResources.GET_COMMANDS_ENDPOINT,
				);
			});

			if (!success) {
				print("Failed to fetch commands:", result);
				return;
			}

			const [parseSuccess, data] = pcall(
				() => HttpService.JSONDecode(result as string) as IIncommingCommands,
			);
			if (!parseSuccess) return;

			const commands = data.commands;
			this.ProcessCommands(commands);
		});
	}

	// Process commands from server
	private ProcessCommands(commands: Array<ICommand>): void {
		const responses: Array<ICommandResponse> = [];
		const command_promises = new Array<Promise<void>>();

		for (const command of commands) {
			const handler = this._commandHandlers.get(command.name);

			const response: ICommandResponse = {
				id: command.id,
				result: undefined,
			};

			if (handler === undefined) {
				response.error = `No handler registered for command '${command.name}'`;
				responses.push(response);
				return;
			}

			command_promises.push(
				Promise.try(() => handler(command.args))
					.then((result) => {
						response.result = result;
					})
					.catch((e) => {
						response.error = tostring(e);
					})
					.finally(() => {
						responses.push(response);
					}),
			);

			Promise.all(command_promises).expect();
			this.SubmitResponses(responses);
		}
	}

	// Submit command responses back to server
	private SubmitResponses(responses: Array<ICommandResponse>): void {
		if (responses.isEmpty()) return;

		const data: IOutgoingCommands = {
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

			if (success) return;
			print("Failed to submit responses:", result);
		});
	}
}
