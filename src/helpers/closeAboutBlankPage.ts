import { Page } from "puppeteer"

export const closeAboutBlankPage = async (pages: Page[]): Promise<void> => {
    if (pages.length <= 1) return;
    if (!pages[0].url().includes("about:blank")) return;

    await pages[0].close()
}