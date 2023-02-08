import {Page} from "puppeteer";
import {leagues} from "../../../types/leagues/leagues.type.js";
import getAllMatches from "./get-all-matches.js";
import chalk from "chalk";

const error = chalk.red.bold;
const other = chalk.magenta.bold;
export const getLeaguesMatches = async (
    page: Page,
    links: string[] = [],
    matches:string[] = [],
    repeat:boolean = true
): Promise <leagues> => {
    let errorsLeagues: string[] = [];
    let numLink = 1;
    const totalLinks = links.length;
    for (let link of links) {
        let label = `${numLink}/${totalLinks} Parse link ${link}`
        console.time(label);
        let matchesLeague = await getAllMatches(page, link)
            .catch((_) => false);
        if (!matchesLeague) {
            errorsLeagues.push(link)
            console.log(error(`${numLink}/${totalLinks} Error with link ${link}`))
            console.timeEnd(label);
            numLink++;
            continue;
        }
        // @ts-ignore
        matches.push(...matchesLeague);
        console.timeEnd(label);
        numLink++;
    }

    let errorIteration = 1
    while (errorsLeagues.length && errorIteration <= 3 && repeat) {
        console.log(other(`Try parse errors. try: ${errorIteration}`));
        let matchesFromLeagues: leagues = await getLeaguesMatches(page, errorsLeagues, matches, false);
        errorIteration++;
        errorsLeagues = matchesFromLeagues.errorsLeagues;
        matches = matchesFromLeagues.matches;
    }

    return {
        // @ts-ignore
        matches,
        errorsLeagues
    }
}
