import fs from "fs";
import TSVFileWriter from "./common/file-writer/tsv-file-writer.js";

const folders = ['./errors', './excel', './urls'];
for (let folder of folders) {
    try {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
    } catch (err) {
        console.error(err);
    }
}

try {
    if (!fs.existsSync('./urls/urls.tsv')) {
        new TSVFileWriter('./urls/urls.tsv');
    }
} catch (err) {
    console.error(err);
}

console.log('all dir created');
