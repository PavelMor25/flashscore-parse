import TSVFileWriter from "../file-writer/tsv-file-writer.js";
import chalk from "chalk";
import fs from 'fs';

const success = chalk.bold.bgGreen.black;
export const errorsWriter = async (type: string, errors: string[], linksError:boolean = false): Promise<void> => {
    const folder = `./errors/${type}`
    try {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
    } catch (err) {
        console.error(err);
    }
    const filepath = `${folder}/errors-${linksError ? 'link' : 'match'}.tsv`
    const tsvFileWriter = new TSVFileWriter(filepath);

    for (let error of errors) {
        await tsvFileWriter.write(error);
    }

    console.log(success(`File ${filepath} was created!`));
}
