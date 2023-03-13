import {CliCommandInterface} from "../cli-commands/cli-command.interface.js";
import fs from "fs";

type ParsedCommand = {
    [key: string]: string[]
}

export default class CliApplication {
    private commands: {[property: string]: CliCommandInterface} = {};
    private defaultCommand = '--help';

    private parseCommand(cliArguments: string[]): ParsedCommand {
        const parsedCommand: ParsedCommand = {};
        let command = '';

        return cliArguments.reduce((acc, item) => {
            if (item.startsWith('--')) {
                acc[item] = [];
                command = item;
            } else if (command && item) {
                acc[command].push(item);
            }

            return acc;
        }, parsedCommand);
    }

    public registerCommands(commandList: CliCommandInterface[]): void {
        this.commands = commandList.reduce((acc, Command) => {
            const cliCommand = Command;
            acc[cliCommand.name] = cliCommand;
            return acc;
        }, this.commands);
    }

    public checkUsesDir(): void {
        const folders = ['./errors','./excel'];
        for (let folder of folders) {
            try {
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
            } catch (err) {
                console.error(err);
            }
        }
    }

    public getCommand(commandName: string): CliCommandInterface {
        if (!this.commands[commandName]) {
            console.log(`Команда "${commandName}" не найдена`);
            return this.commands[this.defaultCommand];
        }
        return this.commands[commandName];
    }

    public async processCommand(argv: string[]): Promise<void> {
        const parsedCommand = this.parseCommand(argv);
        const [commandName] = Object.keys(parsedCommand);
        const command = this.getCommand(commandName);
        const commandArguments = parsedCommand[commandName] ?? [];
        await command.execute(...commandArguments);
    }
}
