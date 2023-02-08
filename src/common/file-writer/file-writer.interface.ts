export interface FileWriterInterface {
    readonly fileName: string;

    write(row: string): void;
}
