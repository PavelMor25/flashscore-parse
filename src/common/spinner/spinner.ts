import { SpinnerInterface } from "./spinner.interface";
import ora, {Ora} from 'ora';
import moment from "moment";

const HOURS = 60 * 60 * 1000
const MINUTES = 60 * 1000
const SECONDS = 1000

export default class Spinner implements SpinnerInterface {
    private _spinner: Ora;
    private _start: moment.Moment | null;

    constructor() {
        this._spinner = ora();
        this._start = null
    }

    start(text: string): void {
        this._start = moment();
        this._spinner.start(text);
    }

    success(text: string): void {
        this._spinner.succeed(this.getTextWithTime(text));
    }

    fail(text: string): void {
        this._spinner.fail(this.getTextWithTime(text));
    }

    updateSpinerText(text: string): void {
        this._spinner.text = text;
    }

    getTextWithTime(text: string): string {
        const start = this._start as moment.Moment;

        const diff = moment().diff(start, 'milliseconds');

        const hours = Math.floor(diff / HOURS);
        const minutes = Math.floor((diff - hours * HOURS)/MINUTES);
        const seconds = Math.floor((diff - hours * HOURS - minutes * MINUTES) / SECONDS);
        const milliseconds = (diff - hours * HOURS - minutes * MINUTES - seconds * SECONDS) % 1000;

        let descTime = '('
        let time = ''
        
        if (hours) {
            time += (hours > 9 ? hours : '0' + hours) + ':';
            descTime += 'hh:' 
        }

        if (hours || minutes) {
            time += (minutes > 9 ? minutes : '0' + minutes) + ':';
            descTime += 'mm:'
        }

        if (hours || minutes || seconds) {
            time += (seconds > 9 ? seconds : '0' + seconds) + '.';
            descTime += 'ss.'
        }

        time += '0'.repeat(3 - `${(milliseconds%1000)}`.length) + milliseconds
        descTime += 'mmm)'

        return text + ' ' + 'Time: ' + time + ' ' + descTime
    }
}