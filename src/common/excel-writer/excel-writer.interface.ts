export interface ExcelWriterInterface {
    execute(type: string): void;
    write<T> (data: T[]): void;
}
