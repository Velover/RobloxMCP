# Connection Feature Documentation

## Overview

The Connection feature enables communication between the MCP server and the Roblox game engine through a long-polling mechanism that simulates WebSockets. Since the game engine doesn't support WebSockets or creating endpoints, this feature implements a polling-based communication system.

## How It Works

1. The game engine periodically sends keep-alive requests to maintain the connection
2. The MCP server queues up commands to be executed by the game engine
3. The game engine polls for commands, executes them, and returns the results
4. The MCP server processes these results and resolves the corresponding promises

## Endpoints

### Keep-Alive

The keep-alive endpoint maintains the connection between the game engine and the MCP server.

- **Endpoint**: `/keep-alive`
- **Method**: `POST`
- **Request Body**: Empty (or can include optional metadata)
- **Response Format**:
  ```json
  {
    "status": "ok",
    "timestamp": 1633456789012
  }
  ```
- **Error Codes**: None specific

The game engine should call this endpoint at least every 5 seconds to ensure the connection isn't dropped.

### Get Commands

The game engine periodically polls this endpoint to receive commands from the MCP server.

- **Endpoint**: `/get-commands`
- **Method**: `POST`
- **Request Body**: Empty (or can include optional metadata)
- **Response Format**:
  ```json
  {
    "commands": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "teleportPlayer",
        "args": {
          "playerId": 123456789,
          "positionX": 100,
          "positionY": 50,
          "positionZ": 200
        },
        "timestamp": 1633456789012
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "giveItem",
        "args": {
          "playerId": 123456789,
          "itemId": "sword_01"
        },
        "timestamp": 1633456789012
      }
    ]
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Connection expired. Send a keep-alive request first."
  }
  ```

### Submit Commands

After executing commands, the game engine submits the results back to the MCP server.

- **Endpoint**: `/submit-commands`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "responses": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "result": {
          "success": true,
          "message": "Player teleported successfully"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "result": null,
        "error": "Player not found"
      }
    ]
  }
  ```
- **Response Format**:
  ```json
  {
    "status": "ok"
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Connection expired. Send a keep-alive request first."
  }
  ```
  or
  ```json
  {
    "error": "Invalid request format. Expected 'responses' array."
  }
  ```

## Data Structures

### Command

A command is a request from the MCP server to the game engine to perform an action.

```typescript
interface ICommand {
  id: string; // Unique identifier for the command
  name: string; // Name of the command to execute
  args: any; // Arguments for the command
  timestamp: number; // When the command was created
}
```

### Command Response

A response from the game engine after executing a command.

```typescript
interface ICommandResponse {
  id: string; // ID of the command being responded to
  result: any; // Result data (null if there was an error)
  error?: string; // Optional error message
  timestamp: number; // When the response was created (added by server)
}
```

## Implementation Example in the Game Engine

Here's a simple implementation example for the game engine:

```lua
-- Constants
local MCP_SERVER_URL = "http://localhost:8080"
local KEEP_ALIVE_INTERVAL = 3 -- seconds
local GET_COMMANDS_INTERVAL = 1 -- seconds

-- Function to send keep-alive request
local function sendKeepAlive()
    local success, result = pcall(function()
        return HttpService:PostAsync(
            MCP_SERVER_URL .. "/keep-alive",
            "{}",
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if not success then
        warn("Failed to send keep-alive: " .. tostring(result))
        return
    end

    print("Keep-alive sent successfully")
end

-- Function to get commands
local function getCommands()
    local success, result = pcall(function()
        return HttpService:PostAsync(
            MCP_SERVER_URL .. "/get-commands",
            "{}",
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if not success then
        warn("Failed to get commands: " .. tostring(result))
        return
    end

    local data = HttpService:JSONDecode(result)

    if data.commands and #data.commands > 0 then
        processCommands(data.commands)
    end
end

-- Function to process commands
local function processCommands(commands)
    local responses = {}

    for _, command in ipairs(commands) do
        local response = {
            id = command.id,
            result = nil,
            error = nil
        }

        -- Execute command based on name
        if command.name == "teleportPlayer" then
            local success, result = pcall(function()
                -- Implementation of teleportPlayer command
                -- ...
                return { success = true, message = "Player teleported" }
            end)

            if success then
                response.result = result
            else
                response.error = tostring(result)
            end
        elseif command.name == "giveItem" then
            -- Implementation of giveItem command
            -- ...
        else
            response.error = "Unknown command"
        end

        table.insert(responses, response)
    end

    -- Submit command responses
    submitResponses(responses)
end

-- Function to submit responses
local function submitResponses(responses)
    local data = {
        responses = responses
    }

    local success, result = pcall(function()
        return HttpService:PostAsync(
            MCP_SERVER_URL .. "/submit-commands",
            HttpService:JSONEncode(data),
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if not success then
        warn("Failed to submit responses: " .. tostring(result))
    end
end

-- Start the keep-alive and get-commands loops
spawn(function()
    while true do
        sendKeepAlive()
        wait(KEEP_ALIVE_INTERVAL)
    end
end)

spawn(function()
    while true do
        getCommands()
        wait(GET_COMMANDS_INTERVAL)
    end
end)
```

## Error Handling

1. If the game engine doesn't send a keep-alive request within 5 seconds, the connection is considered disconnected
2. Commands expire after 30 seconds if no response is received
3. Command responses are stored for up to 5 minutes before being cleaned up
4. If a command fails in the game engine, it should return an error message in the response

## Connection States

The connection can be in one of the following states:

- `CONNECTED`: The connection is active
- `CONNECTING`: The connection is being established (not currently used)
- `DISCONNECTED`: The connection has been lost or hasn't been established yet

## Best Practices

1. The game engine should send keep-alive requests slightly more frequently than the timeout period (e.g., every 3-4 seconds for a 5-second timeout)
2. The game engine should process commands as quickly as possible to avoid timeouts
3. Always include the command ID in responses
4. Handle errors gracefully and provide meaningful error messages
