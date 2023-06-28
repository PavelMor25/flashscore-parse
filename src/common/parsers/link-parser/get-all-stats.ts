import {Page} from "puppeteer";
import {matches} from "../../../types/leagues/matches.type.js";
import chalk from "chalk";

const error = chalk.red.bold;
const other = chalk.magenta.bold;

export const getAllStats = async <F extends Function, J extends Function, T>(
    page: Page,
    matches: string[],
    parseFunc: F,
    jsonFunc: J,
    matchesStats: T[] | [] = [],
    repeat:boolean = true
): Promise<matches<T>> => {
    let errorsMatches = [];
    let numMatch = 1;
    const matchesTotal = matches.length;
    for (let id of matches) {
        let label = `${numMatch}/${matchesTotal} Parse match ${id}`
        console.time(label);
        let match: T = await parseFunc(page, id)
            .then((data: T) => jsonFunc(data))
            .catch((er: Error) => {
                console.log(er)
                return false
            });
        if (!match) {
            errorsMatches.push(id)
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
    while (errorsMatches.length && errorIteration <= 5 && repeat) {
        console.log(other(`Try parse errors. try: ${errorIteration}`));
        let matches: matches<T> = await getAllStats<F,J,T>(
                                                        page,
                                                        errorsMatches,
                                                        parseFunc,
                                                        jsonFunc,
                                                        matchesStats,
                                                  false
                                                        );
        errorIteration++;
        errorsMatches = matches.errorsMatches;
        matchesStats = matches.matchesStats;
    }

    return {
        matchesStats,
        errorsMatches
    }
}

