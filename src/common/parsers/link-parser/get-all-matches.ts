import {MATCH_SELECTORS} from "../../../constants/selectors.js";
import {Page} from "puppeteer";

const getAllMatches = async (page: Page, link: string): Promise<string[]> => {
    const {
        RESULT_TABLE,
        BTN_SHOW_MORE,
        MATCH_LINE,
    } = MATCH_SELECTORS;

        await page.goto(link);

        // Wait results table
        await page.waitForSelector(RESULT_TABLE);

        // Find btn "show more match"
        let buttonMore = null;

        try {
            buttonMore = await page.waitForSelector(BTN_SHOW_MORE, {timeout: 5000});
        } catch {
            buttonMore = null;
        }
        // Click all btns "show more match"
        while (buttonMore) {
            try {
                await page.click(BTN_SHOW_MORE, {delay: 15000});
                buttonMore = await page.waitForSelector(BTN_SHOW_MORE);
            } catch {
                break;
            }
        }

        // Find all matchesType and take they id
        return await page.$$eval(MATCH_LINE, (hds) => hds.map(el => el.id.slice(4)));
}

export default getAllMatches;
