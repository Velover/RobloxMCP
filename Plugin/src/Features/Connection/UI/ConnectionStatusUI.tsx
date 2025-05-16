import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React from "@rbxts/react";
import { GuiResources } from "Features/PluginUI/Resources/GuiResources";
import { ConnectionController } from "../Controllers/ConnectionController";
import { ConnectionResources } from "../Resources/ConnectionResources";

export function ConnectionStatusUI() {
	const connectionController = useFlameworkDependency<ConnectionController>();
	const connectionState = connectionController.useConnectionState();

	// Determine UI elements based on connection state
	let statusColor = ConnectionResources.UI_COLOR_DISCONNECTED;
	let statusText = ConnectionResources.UI_DISCONNECTED_TEXT;
	let showConnectButton = true;

	if (connectionState === ConnectionResources.EConnectionState.CONNECTED) {
		statusColor = ConnectionResources.UI_COLOR_CONNECTED;
		statusText = ConnectionResources.UI_CONNECTED_TEXT;
		showConnectButton = false;
	} else if (connectionState === ConnectionResources.EConnectionState.CONNECTING) {
		statusColor = ConnectionResources.UI_COLOR_CONNECTING;
		statusText = ConnectionResources.UI_CONNECTING_TEXT;
		showConnectButton = false;
	}

	const handleConnect = () => {
		connectionController.Connect();
	};

	const handleDisconnect = () => {
		connectionController.Disconnect();
	};

	return (
		<frame
			BackgroundTransparency={1}
			Size={UDim2.fromScale(1, 0.05)}
			Position={UDim2.fromScale(0, 0.95)}
			AnchorPoint={new Vector2(0, 0)}
		>
			<uilistlayout
				FillDirection={Enum.FillDirection.Horizontal}
				HorizontalAlignment={Enum.HorizontalAlignment.Right}
				VerticalAlignment={Enum.VerticalAlignment.Center}
				Padding={new UDim(0, 5)}
			/>

			<textlabel
				Text="MCP Server:"
				TextColor3={new Color3(0, 0, 0)}
				FontFace={GuiResources.FONT_REGULAR}
				TextSize={14}
				Size={UDim2.fromOffset(80, 20)}
				BackgroundTransparency={1}
			/>

			<frame
				Size={UDim2.fromOffset(100, 20)}
				BackgroundColor3={new Color3(1, 1, 1)}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 4)} />
				<uistroke Color={new Color3(0.8, 0.8, 0.8)} Thickness={1} />
				<textlabel
					Text={statusText}
					TextColor3={statusColor}
					FontFace={GuiResources.FONT_BOLD}
					TextSize={14}
					Size={UDim2.fromScale(1, 1)}
					BackgroundTransparency={1}
				/>
			</frame>

			{/* Connect/Disconnect Button */}
			{showConnectButton ? (
				<textbutton
					Text={ConnectionResources.UI_CONNECT_BUTTON_TEXT}
					TextColor3={new Color3(1, 1, 1)}
					FontFace={GuiResources.FONT_BOLD}
					TextSize={14}
					Size={UDim2.fromOffset(80, 20)}
					BackgroundColor3={ConnectionResources.UI_BUTTON_CONNECT_COLOR}
					BorderSizePixel={0}
					Event={{
						MouseButton1Click: handleConnect,
					}}
				>
					<uicorner CornerRadius={new UDim(0, 4)} />
				</textbutton>
			) : (
				<textbutton
					Text={ConnectionResources.UI_DISCONNECT_BUTTON_TEXT}
					TextColor3={new Color3(1, 1, 1)}
					FontFace={GuiResources.FONT_BOLD}
					TextSize={14}
					Size={UDim2.fromOffset(80, 20)}
					BackgroundColor3={ConnectionResources.UI_BUTTON_DISCONNECT_COLOR}
					BorderSizePixel={0}
					Event={{
						MouseButton1Click: handleDisconnect,
					}}
				>
					<uicorner CornerRadius={new UDim(0, 4)} />
				</textbutton>
			)}

			<frame Size={UDim2.fromOffset(10, 0)} BackgroundTransparency={1} />
		</frame>
	);
}
