import {Page} from "puppeteer";
import {matches} from "../../../types/leagues/matches.type.js";
import {jsonAmFootball} from "../../../types/am-football/json-am-football.type.js";
import {getAllStats} from "../matches/get-all-stats.js";
import {getJsonAmFootball, getParseAmFootballMatch} from "./utils.js";

export const getAllStatsAmFootball = async (page: Page, matches: string[]): Promise<matches<jsonAmFootball[]>> => {
    return await getAllStats<
        typeof getParseAmFootballMatch,
        typeof getJsonAmFootball,
        jsonAmFootball[]>(page, matches, getParseAmFootballMatch, getJsonAmFootball);
}
