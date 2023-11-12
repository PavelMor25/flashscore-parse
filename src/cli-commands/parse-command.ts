import {CliCommandInterface} from "./cli-command.interface.js";
import puppeteer from "puppeteer";
import TsvFileReader from "../common/file-reader/tsv-file-reader.js";
import chalk from "chalk";
import {errorsWriter} from "../common/errors-writer/errors-writer.js";
import {getLeaguesMatches} from "../common/parsers/link-parser/get-leagues-matches.js";
import {jsonFootball} from "../types/football/json-football.type.js";
import ExcelWriter from "../common/excel-writer/excel-writer.js";
import ParserFootball from "../common/parsers/matches-parser/football/parser-football.js";
import {ParserMatchInterface} from "../common/parsers/matches-parser/parser-match.interface.js";
import ParserAmFootball from "../common/parsers/matches-parser/am-football/parser-am-football.js";
import {jsonAmFootball} from "../types/am-football/json-am-football.type.js";
import ParserHockey from "../common/parsers/matches-parser/hockey/parser-hockey.js";
import {jsonHockey} from "../types/hockey/json-hockey.type.js";
import ParserBaseball from "../common/parsers/matches-parser/baseball/parser-baseball.js";
import {jsonBaseball} from "../types/baseball/json-baseball.type.js";
import ParserBasketball from "../common/parsers/matches-parser/basketball/parser-basketball.js";
import { jsonBasketball } from "../types/basketball/json-basketball.type.js";
import Spinner from "../common/spinner/spinner.js";
type ParseType = {
    [key: string]: string
}

const parseName: ParseType = {
    '-f': 'football',
    '-h': 'hockey',
    '-af': 'aFootball',
    '-bb': 'baseball',
    '-b': 'basketball'
}

const success = chalk.green.bold;
const error = chalk.red.bold;
const other = chalk.magenta.bold;

export default class ParseCommand implements CliCommandInterface {
    public readonly name = '--parse';
    private linksLeague: string[] = [];
    private linksErrors: string[] = [];
    private linksMatches: string[] = [];
    private excelWriter: ExcelWriter = new ExcelWriter();
    private _spinner: Spinner = new Spinner()

    private onLine = (url: string, resolve: () => void): void => {
        console.log(url)
        this.linksLeague.push(url);
        resolve();
    }

    private onComplete = (count: number) => {
        console.log(success(`\n${count} urls imported.\n`));
    }

    private cleanArr = () => {
        this.linksLeague = [];
        this.linksMatches = [];
        this.linksErrors = []
    }

    private parseMatches = async <J,F extends ParserMatchInterface<J>> (
        typeMatch: string,
        parser: F,
        link: string): Promise<void> => {
        console.log(other(`\nStart parse ${typeMatch} matchesType:\n`));
        console.time(`\nParse matchesType`);
        let stats = await parser.parseAllMatches();
        console.timeEnd(`\nParse matchesType`);

        this._spinner.start(other(`Write to excel`));
        await this.excelWriter.write<J>(stats.matchesStats);
        this._spinner.success(success(`Excel ready`));

        if (stats.errorsMatches.length) {
            this._spinner.fail(other(`Write errors`));
            await errorsWriter(typeMatch, stats.errorsMatches);
        }
        console.log('-------------------------------------------------- Done ---------------------------------------------------------------------------')
        console.log(`
                    ${link}
                    ${other(`Total matches: ${this.linksMatches.length}`)}
                    ${success(`Matches parse: ${stats.matchesStats.length}`)}
                    ${error(`Errors: ${stats.errorsMatches.length} => ${stats.errorsMatches}`)}
                `);
        console.log('-------------------------------------------------- End ----------------------------------------------------------------------------\n')
    }

    public async execute(type: string): Promise<void> {
        console.time('Parse ready');
        console.log(other('Parse start\n'));

        const fileReader = new TsvFileReader('./urls/urls.tsv');
        fileReader.on('line', this.onLine);
        fileReader.on('end', this.onComplete);

        try {
            await fileReader.read();
        } catch(err) {
            console.log(error(`Can't read the file: ${err}`));
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport({width: 1080, height: 1024});

        let typeFull = parseName[type]

        this.excelWriter.execute(typeFull);

        for (let league of this.linksLeague) {
            const leaguesMatches = await getLeaguesMatches(page, league);

            if (leaguesMatches.errorsLeague) {
                this.linksErrors.push(leaguesMatches.errorsLeague);
                continue;
            }
            this.linksMatches = leaguesMatches.matches;

            console.log(success('\nTotal matchesType to parse:', this.linksMatches.length));
            switch (type) {
                case '-f': {
                    let parserFootball = new ParserFootball(page, this.linksMatches)
                    await this.parseMatches
                        <jsonFootball, ParserFootball>
                        (typeFull, parserFootball, league);
                    break;
                }
                case '-h': {
                    let parserHockey = new ParserHockey(page, this.linksMatches);
                    await this.parseMatches
                        <jsonHockey, ParserHockey>
                        (typeFull, parserHockey, league);
                    break;
                }
                case '-af': {
                    let parserAmFootball = new ParserAmFootball(page, this.linksMatches);
                    await this.parseMatches
                        <jsonAmFootball, ParserAmFootball>
                        (typeFull, parserAmFootball, league);
                    break;
                }
                case '-bb': {
                    let parserBaseball = new ParserBaseball(page, this.linksMatches);
                    await this.parseMatches
                        <jsonBaseball, ParserBaseball>
                        (typeFull, parserBaseball, league);
                    break;
                }
                case '-b': {
                    let parserBasketball = new ParserBasketball(page, this.linksMatches);
                    await this.parseMatches
                        <jsonBasketball, ParserBasketball>
                        (typeFull, parserBasketball, league);
                    break;
                }
            }
        }

        if (this.linksErrors.length) {
            console.log(other(`Write errors`));
            await errorsWriter(type, this.linksErrors, true);
        }

        console.log(`${this.linksErrors.length ? error(`Errors with links: ${this.linksErrors.length}`) : ''}`)
        await browser.close();
        this.cleanArr();
        console.log(success('ALL DONE'));
        console.timeEnd('Parse ready');
    }
}
