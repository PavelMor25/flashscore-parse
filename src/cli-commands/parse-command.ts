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
import {footballMatchStat} from "../types/football/match-stats.type.js";
import ParserAmFootball from "../common/parsers/matches-parser/am-football/parser-am-football.js";
import {amFootballMatchStat} from "../types/am-football/match-stats.type.js";
import {jsonAmFootball} from "../types/am-football/json-am-football.type.js";
import ParserHockey from "../common/parsers/matches-parser/hockey/parser-hockey.js";
import {hockeyMatchStat} from "../types/hockey/match-stats.type.js";
import {jsonHockey} from "../types/hockey/json-hockey.type.js";
import ParserBaseball from "../common/parsers/matches-parser/baseball/parser-baseball.js";
import {baseballMatchStat} from "../types/baseball/match-stats.type.js";
import {jsonBaseball} from "../types/baseball/json-baseball.type.js";
import ParserBasketball from "../common/parsers/matches-parser/basketball/parser-basketball.js";
import { jsonBasketball } from "../types/basketball/json-basketball.type.js";
import { basketballMatchStat } from "../types/basketball/match-stats.type.js";

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

    private onLine = (url: string, resolve: () => void): void => {
        console.log(url)
        this.linksLeague.push(url);
        resolve();
    }

    private onComplete = (count: number) => {
        console.log(success(`${count} urls imported.`));
    }

    private cleanArr = () => {
        this.linksLeague = [];
        this.linksMatches = [];
        this.linksErrors = []
    }

    private parseMatches = async <M,J,F extends ParserMatchInterface<M, J>> (
        typeMatch: string,
        parser: F,
        link: string): Promise<void> => {
        console.log(other(`Start parse ${typeMatch} matchesType`));
        console.time(`Parse matchesType`);
        let stats = await parser.parseAllMatches();
        console.timeEnd(`Parse matchesType`);

        console.log(other(`Write to excel`));
        await this.excelWriter.write<J>(stats.matchesStats);
        console.log(success(`Excel ready`));

        if (stats.errorsMatches.length) {
            console.log(other(`Write errors`));
            await errorsWriter(typeMatch, stats.errorsMatches);
        }

        console.log(`
                    ${link}
                    ----- Done -----
                    ${other(`Total matches: ${this.linksMatches.length}`)}
                    ${success(`Matches parse: ${stats.matchesStats.length}`)}
                    ${error(`Errors: ${stats.errorsMatches.length} => ${stats.errorsMatches}`)}
                    ----- End -----
                `);
    }

    public async execute(type: string): Promise<void> {
        console.time('Parse ready');
        console.log(other('Parse start'));

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
            console.log(other(`
            
                Parse link:
                ${league} 
            
            `));
            const leaguesMatches = await getLeaguesMatches(page, league);

            if (leaguesMatches.errorsLeague) {
                this.linksErrors.push(leaguesMatches.errorsLeague);
                continue;
            }
            this.linksMatches = leaguesMatches.matches;

            console.log(success('Total matchesType to parse:', this.linksMatches.length));
            switch (type) {
                case '-f': {
                    let parserFootball = new ParserFootball(page, this.linksMatches)
                    await this.parseMatches
                        <footballMatchStat, jsonFootball, ParserFootball>
                        (typeFull, parserFootball, league);
                    break;
                }
                case '-h': {
                    let parserHockey = new ParserHockey(page, this.linksMatches);
                    await this.parseMatches
                        <hockeyMatchStat, jsonHockey, ParserHockey>
                        (typeFull, parserHockey, league);
                    break;
                }
                case '-af': {
                    let parserAmFootball = new ParserAmFootball(page, this.linksMatches);
                    await this.parseMatches
                        <amFootballMatchStat, jsonAmFootball, ParserAmFootball>
                        (typeFull, parserAmFootball, league);
                    break;
                }
                case '-bb': {
                    let parserBaseball = new ParserBaseball(page, this.linksMatches);
                    await this.parseMatches
                        <baseballMatchStat, jsonBaseball, ParserBaseball>
                        (typeFull, parserBaseball, league);
                    break;
                }
                case '-b': {
                    let parserBasketball = new ParserBasketball(page, this.linksMatches);
                    await this.parseMatches
                        <basketballMatchStat, jsonBasketball, ParserBasketball>
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
