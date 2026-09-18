/**
 * MatrixSheet - Multi-Sheet Workbook Model, Formatter & Command History
 */
import { FormulaAST } from './formula-ast.js';
import { ReactiveDAG } from './reactive-dag.js';

export class SheetModel {
  constructor() {
    this.sheets = new Map(); // sheetName -> Map of cellCoord (e.g. 'A1') -> CellObj
    this.activeSheetName = 'Financial Model';
    this.dag = new ReactiveDAG();
    this.ast = new FormulaAST(this.resolveCellValue.bind(this));
    this.undoStack = [];
    this.redoStack = [];

    this.initWorkbook();
  }

  initWorkbook() {
    this.addSheet('Financial Model');
    this.addSheet('CapEx & Valuation');
    this.seedFinancialModel('Financial Model');
    this.seedValuationModel('CapEx & Valuation');
    this.recalculateAll();
  }

  addSheet(name) {
    if (!this.sheets.has(name)) {
      this.sheets.set(name, new Map());
    }
  }

  getCell(coord, sheetName = this.activeSheetName) {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) return null;
    return sheet.get(coord) || { raw: '', computed: '', format: 'general', style: {} };
  }

  setCell(coord, rawVal, format = 'general', style = {}, sheetName = this.activeSheetName) {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) return;

    const key = `${sheetName}!${coord}`;
    const oldCell = sheet.get(coord);

    const cellObj = {
      raw: String(rawVal),
      computed: '',
      format: format || oldCell?.format || 'general',
      style: { ...(oldCell?.style || {}), ...style }
    };
    sheet.set(coord, cellObj);

    // Extract dependencies if formula
    if (String(rawVal).startsWith('=')) {
      const deps = this.ast.extractDependencies(String(rawVal), sheetName);
      this.dag.setDependencies(key, deps);

      // Check for cycles
      if (this.dag.detectCycle(key)) {
        cellObj.computed = '#CYCLE!';
        return;
      }
    } else {
      this.dag.setDependencies(key, []);
    }

    this.recalculateFrom(key);
  }

  recalculateFrom(triggerKey) {
    const { hasCycle, order } = this.dag.getTopologicalOrder(triggerKey);
    if (hasCycle) {
      const [sName, coord] = triggerKey.split('!');
      const c = this.sheets.get(sName)?.get(coord);
      if (c) c.computed = '#CYCLE!';
      return;
    }

    order.forEach(cellKey => {
      const [sName, coord] = cellKey.split('!');
      const cell = this.sheets.get(sName)?.get(coord);
      if (!cell) return;

      if (cell.raw.startsWith('=')) {
        try {
          cell.computed = this.ast.evaluate(cell.raw, sName);
        } catch (err) {
          cell.computed = err.message || '#ERROR!';
        }
      } else {
        cell.computed = isNaN(cell.raw) || cell.raw === '' ? cell.raw : Number(cell.raw);
      }
    });
  }

  recalculateAll() {
    this.sheets.forEach((cells, sName) => {
      cells.forEach((cell, coord) => {
        const key = `${sName}!${coord}`;
        if (cell.raw.startsWith('=')) {
          const deps = this.ast.extractDependencies(cell.raw, sName);
          this.dag.setDependencies(key, deps);
        }
      });
    });

    this.sheets.forEach((cells, sName) => {
      cells.forEach((cell, coord) => {
        if (cell.raw.startsWith('=')) {
          try {
            cell.computed = this.ast.evaluate(cell.raw, sName);
          } catch (e) {
            cell.computed = e.message || '#ERROR!';
          }
        } else {
          cell.computed = isNaN(cell.raw) || cell.raw === '' ? cell.raw : Number(cell.raw);
        }
      });
    });
  }

  resolveCellValue(key) {
    let [sName, coord] = key.split('!');
    if (!coord) {
      coord = sName;
      sName = this.activeSheetName;
    }
    const cell = this.sheets.get(sName)?.get(coord);
    if (!cell) return 0;
    return typeof cell.computed === 'number' ? cell.computed : (Number(cell.computed) || cell.computed || 0);
  }

  seedFinancialModel(sheetName) {
    const set = (c, val, fmt = 'general', style = {}) => this.setCell(c, val, fmt, style, sheetName);

    // Headers
    set('A1', 'Enterprise P&L Forecast', 'general', { bold: true });
    set('B1', 'Q1 (SAR)', 'general', { bold: true, align: 'right' });
    set('C1', 'Q2 (SAR)', 'general', { bold: true, align: 'right' });
    set('D1', 'Q3 (SAR)', 'general', { bold: true, align: 'right' });
    set('E1', 'Q4 (SAR)', 'general', { bold: true, align: 'right' });
    set('F1', 'FY Total', 'general', { bold: true, align: 'right' });

    // Revenue
    set('A2', 'Gross Revenue');
    set('B2', '450000', 'currency_sar');
    set('C2', '520000', 'currency_sar');
    set('D2', '610000', 'currency_sar');
    set('E2', '740000', 'currency_sar');
    set('F2', '=SUM(B2:E2)', 'currency_sar', { bold: true });

    // COGS
    set('A3', 'Cost of Goods Sold (COGS)');
    set('B3', '180000', 'currency_sar');
    set('C3', '210000', 'currency_sar');
    set('D3', '240000', 'currency_sar');
    set('E3', '290000', 'currency_sar');
    set('F3', '=SUM(B3:E3)', 'currency_sar', { bold: true });

    // Gross Profit
    set('A4', 'Gross Profit', 'general', { bold: true });
    set('B4', '=B2-B3', 'currency_sar');
    set('C4', '=C2-C3', 'currency_sar');
    set('D4', '=D2-D3', 'currency_sar');
    set('E4', '=E2-E3', 'currency_sar');
    set('F4', '=SUM(B4:E4)', 'currency_sar', { bold: true });

    // Operating Expenses
    set('A5', 'R&D / Cloud Engineering');
    set('B5', '85000', 'currency_sar');
    set('C5', '92000', 'currency_sar');
    set('D5', '98000', 'currency_sar');
    set('E5', '110000', 'currency_sar');
    set('F5', '=SUM(B5:E5)', 'currency_sar');

    set('A6', 'Sales & Marketing');
    set('B6', '60000', 'currency_sar');
    set('C6', '65000', 'currency_sar');
    set('D6', '72000', 'currency_sar');
    set('E6', '80000', 'currency_sar');
    set('F6', '=SUM(B6:E6)', 'currency_sar');

    // Total OPEX
    set('A7', 'Total Operating Expenses', 'general', { bold: true });
    set('B7', '=B5+B6', 'currency_sar');
    set('C7', '=C5+C6', 'currency_sar');
    set('D7', '=D5+D6', 'currency_sar');
    set('E7', '=E5+E6', 'currency_sar');
    set('F7', '=SUM(B7:E7)', 'currency_sar', { bold: true });

    // EBITDA
    set('A8', 'Operating Income (EBITDA)', 'general', { bold: true });
    set('B8', '=B4-B7', 'currency_sar');
    set('C8', '=C4-C7', 'currency_sar');
    set('D8', '=D4-D7', 'currency_sar');
    set('E8', '=E4-E7', 'currency_sar');
    set('F8', '=SUM(B8:E8)', 'currency_sar', { bold: true });

    // Corporate Zakat / Tax (15%)
    set('A9', 'Tax / Zakat (15%)');
    set('B9', '=ROUND(B8*0.15, 0)', 'currency_sar');
    set('C9', '=ROUND(C8*0.15, 0)', 'currency_sar');
    set('D9', '=ROUND(D8*0.15, 0)', 'currency_sar');
    set('E9', '=ROUND(E8*0.15, 0)', 'currency_sar');
    set('F9', '=SUM(B9:E9)', 'currency_sar');

    // Net Profit
    set('A10', 'Net Net Profit', 'general', { bold: true, bg: '#e8f5e9' });
    set('B10', '=B8-B9', 'currency_sar', { bold: true });
    set('C10', '=C8-C9', 'currency_sar', { bold: true });
    set('D10', '=D8-D9', 'currency_sar', { bold: true });
    set('E10', '=E8-E9', 'currency_sar', { bold: true });
    set('F10', '=SUM(B10:E10)', 'currency_sar', { bold: true });
  }

  seedValuationModel(sheetName) {
    const set = (c, val, fmt = 'general', style = {}) => this.setCell(c, val, fmt, style, sheetName);

    set('A1', 'Project Capital Budgeting & NPV', 'general', { bold: true });
    set('A2', 'Discount Rate');
    set('B2', '0.10', 'percent');

    set('A3', 'Year 0 (CapEx Initial)');
    set('B3', '-500000', 'currency_sar');

    set('A4', 'Year 1 Inflow');
    set('B4', '150000', 'currency_sar');

    set('A5', 'Year 2 Inflow');
    set('B5', '220000', 'currency_sar');

    set('A6', 'Year 3 Inflow');
    set('B6', '280000', 'currency_sar');

    set('A7', 'Year 4 Inflow');
    set('B7', '340000', 'currency_sar');

    set('A8', 'Net Present Value (NPV)', 'general', { bold: true });
    set('B8', '=ROUND(NPV(B2, B4:B7) + B3, 2)', 'currency_sar', { bold: true });
  }

  formatValue(val, fmt) {
    if (val === '' || val === null || val === undefined) return '';
    if (String(val).startsWith('#')) return val; // Error codes
    const n = Number(val);
    if (isNaN(n)) return val;

    switch (fmt) {
      case 'currency_sar':
        return `${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} SAR`;
      case 'currency_usd':
        return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${(n * 100).toFixed(1)}%`;
      case 'decimal_2':
        return n.toFixed(2);
      default:
        return Number.isInteger(n) ? n.toString() : n.toFixed(2);
    }
  }

  exportCSV(sheetName = this.activeSheetName) {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) return '';
    const maxRow = 15;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

    let csv = '';
    for (let r = 1; r <= maxRow; r++) {
      const rowVals = cols.map(c => {
        const cell = sheet.get(`${c}${r}`);
        const v = cell ? (cell.computed !== '' ? cell.computed : cell.raw) : '';
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      csv += rowVals.join(',') + '\n';
    }
    return csv;
  }
}
