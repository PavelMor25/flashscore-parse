import XLSX from 'xlsx';
import {jsonFootball} from "../../types/football/json-football.type.js";
import moment from "moment";
export const exselWriter = (data: jsonFootball[], type: string) => {
    const workbook = XLSX.readFile('./excel/stats.xlsx');

    const now = moment();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        `${type}-${now.get('day')}.${now.get('month')}.${now.get('year')}-${now.get('hour')}.${now.get('minutes')}`
    );
    XLSX.writeFile(workbook, './excel/stats.xlsx')
}
