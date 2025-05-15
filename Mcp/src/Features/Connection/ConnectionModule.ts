import { Module } from "app-leaf";
import { ConnectionController } from "./Controllers/ConnectionController";

@Module([ConnectionController])
export class ConnectionModule {}
