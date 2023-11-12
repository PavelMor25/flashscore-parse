import {Page} from "puppeteer";
import {leagues} from "../../../types/leagues/leagues.type.js";
import getAllMatches from "./get-all-matches.js";
import chalk from "chalk";
import Spinner from "../../spinner/spinner.js";

const error = chalk.red.bold;
const other = chalk.magenta.bold;
export const getLeaguesMatches = async (
    page: Page,
    link: string,
    matches:string[] = [],
    repeat:boolean = true,
    errorIteration: number = 0
): Promise <leagues> => {
    let errorsLeague = '';
    const spinner = new Spinner()
    spinner.start(other(`Parse link: ${link}`))
    try {
        let matchesLeague = await getAllMatches(page, link);
        matches.push(...matchesLeague);
        spinner.success(`${link} ready`);
    } catch (err) {
        errorsLeague = link
        spinner.fail(error(`Error with link ${link}`))

        while (errorsLeague && errorIteration <= 3 && repeat) {
            errorIteration++;
            console.log(other(`Try parse errors. try: ${errorIteration}`));
            let matchesFromLeagues: leagues = await getLeaguesMatches(page, errorsLeague, matches, false);
            errorsLeague = matchesFromLeagues.errorsLeague;
            matches = matchesFromLeagues.matches;
        }
    }

    return {
        // @ts-ignore
        matches,
        errorsLeague
    }
}
