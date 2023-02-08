import {Page} from "puppeteer";
import {getParseMatch, getJsonFootball} from "./utils.js";
import {jsonFootball} from "../../../types/football/json-football.type.js"
import chalk from "chalk";

const error = chalk.red.bold;
const other = chalk.magenta.bold;

type matches = {
    matchesStats: jsonFootball[],
    errorsMatch: string[]
}
export const getAllStatsFootball = async (
        page: Page,
        matches: string[],
        matchesStats: jsonFootball[] = [],
        repeat:boolean = true
): Promise<matches> => {
    let errorsMatch = [];
    let numMatch = 1;
    const matchesTotal = matches.length;
    for (let id of matches) {
        let label = `${numMatch}/${matchesTotal} Parse match ${id}`
        console.time(label);
        let match = await getParseMatch(page, id)
            .then((data) => getJsonFootball(data))
            .catch((_) => false);
        if (!match) {
            errorsMatch.push(id)
            console.log(error(`${numMatch}/${matchesTotal} Error with match ${id}`))
            console.timeEnd(label);
            numMatch++;
            continue;
        }
        // @ts-ignore
        matchesStats.push(match);
        console.timeEnd(label);
        numMatch++;
    }

    let errorIteration = 1
    while (errorsMatch.length && errorIteration <= 3 && repeat) {
        console.log(other(`Try parse errors. try: ${errorIteration}`));
        let matches: matches = await getAllStatsFootball(page, errorsMatch, matchesStats, false);
        errorIteration++;
        errorsMatch = matches.errorsMatch;
        matchesStats = matches.matchesStats;
    }

    return {
    // @ts-ignore
        matchesStats,
        errorsMatch
    }
}

