import XLSX from 'xlsx';
import moment from "moment";
import fs from 'fs';
export const exselWriter = <T> (data: T[], type: string) => {
    const isExsist = fs.existsSync('./excel/stats.xlsx');
    const workbook = isExsist ? XLSX.readFile('./excel/stats.xlsx') : XLSX.utils.book_new()
    const now = moment();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        `${type}-${now.get('day')}.${now.get('month')}.${now.get('year')}-${now.get('hour')}.${now.get('minutes')}`
    );
    XLSX.writeFile(workbook, './excel/stats.xlsx')
}
