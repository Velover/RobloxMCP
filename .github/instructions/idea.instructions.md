I'm making an mcp server and i want to connect it with the game engine.
The problem that the game engine doesnt support the websockets and cannot create endpoints, therefore we have to make an emulation of websocket where the game engine will periodically fire /keep-alive endpoint to keep the websocket alive. Then when the program wants to do something in the game engine it creates a command and puts it to the list with command name and id. The game engine fetches the commands with some period (1s), process them and submit back the results with corresponding ids.
Right not we are doing the Program side that will host the endpoints and will allow anything to make commands.

- handle the commands system
- add functions to this controller to handle the commands

```
RunCommand(name: string, args: any): StringId
async GetResponce(id: StringId): any
CancelCommand(id: StringId): boolean
```

make sure to handle command removing when the command is finished or cancelled
