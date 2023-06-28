import {Page} from "puppeteer";
import {matches} from "../../../types/leagues/matches.type.js";

export interface ParserMatchInterface<M,T> {
    readonly page: Page;
    matches: string[];
    parseMatch(id:string): Promise<M>
    toJson(el: M): void
    parseAllMatches(errIteration?: number, repeat?: boolean, errorsMatches?: string[]): Promise<matches<T>>
}
