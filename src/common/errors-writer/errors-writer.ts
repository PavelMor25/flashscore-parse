import TSVFileWriter from "../file-writer/tsv-file-writer.js";
import chalk from "chalk";

const success = chalk.bold.bgGreen.black;
export const errorsWriter = async (type: string, errors: string[], linksError:boolean = false): Promise<void> => {
    const filepath = `./errors/${type}/errors-${linksError ? 'link' : 'match'}.tsv`
    const tsvFileWriter = new TSVFileWriter(filepath);

    for (let error of errors) {
        await tsvFileWriter.write(error);
    }

    console.log(success(`File ${filepath} was created!`));
}
