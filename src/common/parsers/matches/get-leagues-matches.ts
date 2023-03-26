import {Page} from "puppeteer";
import {leagues} from "../../../types/leagues/leagues.type.js";
import getAllMatches from "./get-all-matches.js";
import chalk from "chalk";

const error = chalk.red.bold;
const other = chalk.magenta.bold;
export const getLeaguesMatches = async (
    page: Page,
    link: string,
    matches:string[] = [],
    repeat:boolean = true
): Promise <leagues> => {
    let errorsLeague = '';
    console.time(`${link} ready: `);
    let matchesLeague = await getAllMatches(page, link)
        .catch((err) => {
            console.log(err)
            return false
        });
    if (!matchesLeague) {
        errorsLeague = link
        console.log(error(`Error with link ${link}`))
        console.timeEnd(`${link} ready: `);
    }
    // @ts-ignore
    matches.push(...matchesLeague);
    console.timeEnd(`${link} ready: `);

    let errorIteration = 1
    while (errorsLeague && errorIteration <= 3 && repeat) {
        console.log(other(`Try parse errors. try: ${errorIteration}`));
        let matchesFromLeagues: leagues = await getLeaguesMatches(page, errorsLeague, matches, false);
        errorIteration++;
        errorsLeague = matchesFromLeagues.errorsLeague;
        matches = matchesFromLeagues.matches;
    }

    return {
        // @ts-ignore
        matches,
        errorsLeague
    }
}
