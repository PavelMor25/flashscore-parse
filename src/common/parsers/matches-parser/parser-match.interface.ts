import {Page} from "puppeteer";
import {matches} from "../../../types/leagues/matches.type.js";

export interface ParserMatchInterface<T> {
    readonly page: Page;
    matches: string[];
    parseAllMatches(errIteration?: number, repeat?: boolean, errorsMatches?: string[]): Promise<matches<T>>
}
