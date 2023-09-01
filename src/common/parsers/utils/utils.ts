import {Page} from "puppeteer";
import moment from "moment";
import {MATCHES_SELECTORS} from "../../../constants/selectors.js";
import {common} from "../../../types/matches/common.type";
import {exDataType} from "../../../types/matches/exData.type";

export const getContent = async (page: Page, selector: string) => {
    return await page.$$eval(selector, (hds) => hds.map((el) => el.textContent));
};

export const getExData = async (page: Page): Promise<exDataType> => {
    const dData = await page.$('.mi__data');
    const rowsDData = await dData?.$$('.mi__item') ?? [];
    const exData = {};
    for (let row of rowsDData) {
        let name = await row.$eval('.mi__item__name', el => el.textContent?.replace(':',''));
        // @ts-ignore
        exData[name] =  await row.$eval('.mi__item__val', el => el.textContent.replace(' ', ''));
    }

    return exData
};

export const getCommonInfoMatch = async (page: Page): Promise<common> => {
    const {
        NAME_TEAMS,
        LEAGUE,
        SCORES,
        DATE,
        ODDS,
    } = MATCHES_SELECTORS;

    let countryLeague = await page.$eval(LEAGUE, (el) => el.textContent);
    let country = countryLeague?.split(': ')[0] ?? '';
    let league = countryLeague?.split(': ')[1] ?? '';

    let homeScore = await page.$eval(SCORES.HOME, (el) => el.textContent);

    let awayScore = await page.$eval(SCORES.AWAY, (el) => el.textContent);

    let time = await page.$eval(DATE, (el) => el.textContent);

    let dateTime = moment(time, 'DD.MM.YYYY kk:mm').toDate();

    let pair = await getContent(page, NAME_TEAMS);

    // Get odds
    await page.waitForSelector(ODDS.ODDS_ROW, {timeout: 5000}).catch(_ => false);
    // @ts-ignore
    let oddsName = await page.$eval(ODDS.NAME, (el) => el.title).catch((_)=>null);
    let oddsValue = await getContent(page, ODDS.VALUE);

    return {
        country,
        league,
        homeScore,
        awayScore,
        dateTime,
        pair,
        oddsName,
        oddsValue
    }
};

export const replacerStatName = (str: string): string => {
    if ('0123456789'.includes(str)) {
        return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][+str];
    }
    return '';
}
