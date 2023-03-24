import {CliCommandInterface} from "./cli-command.interface.js";


export default class HelpCommand implements CliCommandInterface {
    public readonly name = '--help';


    public async execute(): Promise<void> {
        console.log(`
            Программа для парсинга итогов спортивных событий с сайта flashcore.com
            Пример:
                --<command> [--arguments]
            Команды:
                --version       # версия
                --help          # печатает данное сообщение
                --parse <t>  <e>   # парсит список ссылок из файла с заданным типом 
                                     (<e>: не обязательный параметр -e для парсинга ошибок с прошлого парсера)
            Типы:
                -f  #Football
                -h  #Hockey
                -am #Amr.Football
        `);
    }
}
