import { config } from "dotenv"
import { createBrowser } from "./services/createBrowser";

const main = () => {
    config();
    createBrowser();
}

try {
    main();
} catch (err) {
    console.log(err);
}