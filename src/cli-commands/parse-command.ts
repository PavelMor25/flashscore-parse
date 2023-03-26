import {CliCommandInterface} from "./cli-command.interface.js";
import puppeteer, {Page} from "puppeteer";
import TsvFileReader from "../common/file-reader/tsv-file-reader.js";
import chalk from "chalk";
import {errorsWriter} from "../common/errors-writer/errors-writer.js";
import {getLeaguesMatches} from "../common/parsers/matches/get-leagues-matches.js";
import {getAllStatsFootball} from "../common/parsers/football/get-all-stats-football.js";
import {getAllStatsHockey} from "../common/parsers/hockey/get-all-stats-hockey.js";
import {jsonHockey} from "../types/hockey/json-hockey.type.js";
import {jsonFootball} from "../types/football/json-football.type.js";
import {getAllStatsAmFootball} from "../common/parsers/am-football/get-all-stats-am-football.js";
import {jsonAmFootball} from "../types/am-football/json-am-football.type.js";
import ExcelWriter from "../common/excel-writer/excel-writer.js";

type ParseType = {
    [key: string]: string
}

const parseName: ParseType = {
    '-f': 'football',
    '-h': 'hockey',
    '-af': 'aFootball'
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

    private parseMatches = async <F extends Function, T> (
        typeMatch: string,
        parseFunc: F,
        page: Page,
        link: string): Promise<void> => {
        console.log(other(`Start parse ${typeMatch} matchesType`));
        console.time(`Parse matchesType`);
        let stats = await parseFunc(page, this.linksMatches);
        console.timeEnd(`Parse matchesType`);

        console.log(other(`Write to excel`));
        await this.excelWriter.write<T>(stats.matchesStats);
        console.log(success(`Excel ready`));

        if (stats.errorsMatch.length) {
            console.log(other(`Write errors`));
            await errorsWriter(typeMatch, stats.errorsMatch);
        }

        console.log(`
                    ${link}
                    ----- Done -----
                    ${other(`Total matches: ${this.linksMatches.length}`)}
                    ${success(`Matches parse: ${stats.matchesStats.length}`)}
                    ${error(`Errors: ${stats.errorsMatch.length} => ${stats.errorsMatch}`)}
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
                    await this.parseMatches<typeof getAllStatsFootball, jsonFootball>(typeFull, getAllStatsFootball, page, league);
                    break;
                }
                case '-h': {
                    await this.parseMatches<typeof getAllStatsHockey, jsonHockey>(typeFull, getAllStatsHockey, page, league);
                    break;
                }
                case '-af': {
                    await this.parseMatches<typeof getAllStatsAmFootball, jsonAmFootball>(typeFull, getAllStatsAmFootball, page, league);
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
