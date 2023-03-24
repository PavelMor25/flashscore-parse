import CliApplication from "./app/cli-app.js";
import HelpCommand from "./cli-commands/help-command.js";
import VersionCommand from "./cli-commands/version-command.js";
import ParseCommand from "./cli-commands/parse-command.js";
import readline from "readline";

const readLineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const myManager = new CliApplication();
myManager.registerCommands([
    new HelpCommand,
    new VersionCommand,
    new ParseCommand,
]);

console.log(`
    Добро пожаловать в Flashscore parser.
    Для информации о списке команд введите --help.
`);
 const getCommand = () => {
    readLineInterface.question('Введите команду: ', async (command) => {
        await myManager.processCommand(command.split(' '))
        getCommand();
    });
}

getCommand();
