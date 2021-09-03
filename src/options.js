import { get } from './utils';
const pattern = /\{\{\s*(.+?)\s*\}\}/g;
const resolver = get;

const defaults = { pattern, resolver };
export { defaults };
