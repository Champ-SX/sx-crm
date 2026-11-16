// xlsx-js-style ships no typings; it is SheetJS with cell styles (cell.s).
declare module 'xlsx-js-style' {
  import * as XLSX from 'xlsx'
  export = XLSX
}
