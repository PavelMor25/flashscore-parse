import {Page} from "puppeteer";

export const getContent = async (page: Page, selector: string) => {
    return await page.$$eval(selector, (hds) => hds.map((el) => el.textContent));
}
