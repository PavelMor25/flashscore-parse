import XLSX from 'xlsx';
import moment from "moment";
import fs from 'fs';
import {ExcelWriterInterface} from "./excel-writer.interface.js";

export default class ExcelWriter implements ExcelWriterInterface {
    private listName: string = '';
    private workbook: XLSX.WorkBook;

    constructor() {
        const isExsist = fs.existsSync('./excel/stats.xlsx');
        this.workbook = isExsist ? XLSX.readFile('./excel/stats.xlsx') : XLSX.utils.book_new()
    }

    execute(type: string) {
        const now = moment();
        this.listName = `${type}-${now.get('day')}.${now.get('month')}.${now.get('year')}-${now.get('hour')}.${now.get('minutes')}`
    }

    write<T>(data: T[]) {
        if (!this.workbook.Sheets[this.listName]) {
            let workSheet = XLSX.utils.json_to_sheet(data)
            XLSX.utils.book_append_sheet(this.workbook, workSheet, this.listName);
        } else {
            let workSheet = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.listName]);
            workSheet.push(...data);
            XLSX.utils.sheet_add_json(this.workbook.Sheets[this.listName], workSheet);
        }
        XLSX.writeFile(this.workbook, './excel/stats.xlsx')
    }
}


