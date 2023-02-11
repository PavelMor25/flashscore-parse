import {CliCommandInterface} from "./cli-command.interface.js";
import puppeteer from "puppeteer";
import {exselWriter} from "../common/exsel-writer/exsel-writer.js";
import TsvFileReader from "../common/file-reader/tsv-file-reader.js";
import chalk from "chalk";
import {errorsWriter} from "../common/errors-writer/errors-writer.js";
import {getLeaguesMatches} from "../common/parsers/matches/get-leagues-matches.js";
import {getAllStatsFootball} from "../common/parsers/football/get-all-stats-football.js";

const success = chalk.green.bold;
const error = chalk.red.bold;
const other = chalk.magenta.bold;

export default class ParseCommand implements CliCommandInterface {
    public readonly name = '--parse';
    private linksLeague: string[] = [];
    private linksErrors: string[] = [];
    private linksMatches: string[] = [];

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

        // Set screen size
        await page.setViewport({width: 1080, height: 1024});

        console.log(other('Parse links'))
        const leaguesMatches = await getLeaguesMatches(page, this.linksLeague);
        this.linksErrors = leaguesMatches.errorsLeagues;
        this.linksMatches = leaguesMatches.matches;

        console.log(success('Total matchesType to parse:', this.linksMatches.length));
        switch (type) {
            case '-f': {
                console.log(other('Start parse football matchesType'));
                console.time('Parse matchesType');
                let stats = await getAllStatsFootball(page,this.linksMatches);
                console.timeEnd('Parse matchesType');

                console.log(other('Write to excel'));
                exselWriter(stats.matchesStats,'football');
                console.log(success('Excel ready'));

                if (stats.errorsMatch.length) {
                    console.log(other('Write errors'));
                    errorsWriter('football', stats.errorsMatch);
                }

                if (this.linksErrors.length) {
                    console.log(other('Write errors'));
                    errorsWriter('football', this.linksErrors, true);
                }

                console.log(`
                    ${other(`Total matches: ${this.linksMatches.length}`)}
                    ${success(`Matches parse: ${stats.matchesStats.length}`)}
                    ${error(`Errors: ${stats.errorsMatch.length} => ${stats.errorsMatch}`)}
                    ${this.linksErrors.length ? error(`Errors with links: ${this.linksErrors.length}`) : ''}
                `);

                break;
            }
            case '-h': {
                break;
            }
        }


        await browser.close();
        this.cleanArr();
        console.log(success('ALL DONE'));
        console.timeEnd('Parse ready');
    }
}
