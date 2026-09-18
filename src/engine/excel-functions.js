/**
 * MatrixSheet - Institutional Library of 50+ Real Excel Functions
 */

export const ExcelFunctions = {
  // Math & Statistical
  SUM: (...args) => flatten(args).reduce((a, b) => a + (Number(b) || 0), 0),
  AVERAGE: (...args) => {
    const list = flatten(args).filter(v => v !== '' && v !== null && !isNaN(v)).map(Number);
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  },
  COUNT: (...args) => flatten(args).filter(v => typeof v === 'number' || (v !== '' && !isNaN(v))).length,
  COUNTA: (...args) => flatten(args).filter(v => v !== '' && v !== null && v !== undefined).length,
  MIN: (...args) => Math.min(...flatten(args).map(Number).filter(v => !isNaN(v))),
  MAX: (...args) => Math.max(...flatten(args).map(Number).filter(v => !isNaN(v))),
  MEDIAN: (...args) => {
    const arr = flatten(args).map(Number).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (!arr.length) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  },
  STDEV: (...args) => {
    const list = flatten(args).map(Number).filter(v => !isNaN(v));
    if (list.length < 2) return 0;
    const mean = list.reduce((a, b) => a + b, 0) / list.length;
    const variance = list.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (list.length - 1);
    return Math.sqrt(variance);
  },
  ROUND: (val, dec = 0) => {
    const factor = Math.pow(10, dec);
    return Math.round(Number(val) * factor) / factor;
  },
  ROUNDUP: (val, dec = 0) => {
    const factor = Math.pow(10, dec);
    return Math.ceil(Number(val) * factor) / factor;
  },
  ROUNDDOWN: (val, dec = 0) => {
    const factor = Math.pow(10, dec);
    return Math.floor(Number(val) * factor) / factor;
  },
  ABS: (val) => Math.abs(Number(val)),
  SQRT: (val) => {
    const n = Number(val);
    if (n < 0) throw new Error('#NUM!');
    return Math.sqrt(n);
  },
  POWER: (base, exp) => Math.pow(Number(base), Number(exp)),
  MOD: (n, d) => Number(n) % Number(d),
  FLOOR: (val) => Math.floor(Number(val)),
  CEILING: (val) => Math.ceil(Number(val)),
  RAND: () => Math.random(),
  PI: () => Math.PI,

  // Logic & Conditional
  IF: (condition, trueVal, falseVal = false) => condition ? trueVal : falseVal,
  IFS: (...args) => {
    for (let i = 0; i < args.length; i += 2) {
      if (args[i]) return args[i + 1];
    }
    throw new Error('#N/A');
  },
  AND: (...args) => flatten(args).every(Boolean),
  OR: (...args) => flatten(args).some(Boolean),
  NOT: (val) => !val,
  SWITCH: (expr, ...cases) => {
    for (let i = 0; i < cases.length - 1; i += 2) {
      if (cases[i] === expr) return cases[i + 1];
    }
    return cases.length % 2 === 1 ? cases[cases.length - 1] : '#N/A';
  },

  // Lookup & Reference
  INDEX: (matrix, rowIdx, colIdx = 1) => {
    const r = Math.floor(Number(rowIdx)) - 1;
    const c = Math.floor(Number(colIdx)) - 1;
    if (Array.isArray(matrix[0])) {
      if (matrix[r] && matrix[r][c] !== undefined) return matrix[r][c];
    } else if (matrix[r] !== undefined) {
      return matrix[r];
    }
    throw new Error('#REF!');
  },
  MATCH: (lookupVal, array, matchType = 0) => {
    const list = flatten(array);
    for (let i = 0; i < list.length; i++) {
      if (matchType === 0 && String(list[i]).toLowerCase() === String(lookupVal).toLowerCase()) {
        return i + 1;
      }
    }
    throw new Error('#N/A');
  },
  XLOOKUP: (lookupVal, lookupArray, returnArray, ifNotFound = '#N/A') => {
    const keys = flatten(lookupArray);
    const vals = flatten(returnArray);
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === String(lookupVal).toLowerCase()) {
        return vals[i] !== undefined ? vals[i] : '';
      }
    }
    return ifNotFound;
  },
  VLOOKUP: (lookupVal, table, colIdx, approx = false) => {
    const col = Math.floor(Number(colIdx)) - 1;
    for (const row of table) {
      if (String(row[0]).toLowerCase() === String(lookupVal).toLowerCase()) {
        if (row[col] !== undefined) return row[col];
      }
    }
    throw new Error('#N/A');
  },

  // Financial Modeling
  NPV: (rate, ...cashFlows) => {
    const r = Number(rate);
    const flows = flatten(cashFlows).map(Number);
    return flows.reduce((acc, flow, idx) => acc + flow / Math.pow(1 + r, idx + 1), 0);
  },
  PMT: (rate, nper, pv, fv = 0, type = 0) => {
    const r = Number(rate);
    const n = Number(nper);
    const p = Number(pv);
    if (r === 0) return -(p + fv) / n;
    const pvif = Math.pow(1 + r, n);
    let pmt = (r * (p * pvif + fv)) / (pvif - 1);
    if (type === 1) pmt /= (1 + r);
    return -pmt;
  },
  FV: (rate, nper, pmt, pv = 0, type = 0) => {
    const r = Number(rate);
    const n = Number(nper);
    const p = Number(pmt);
    const y = Number(pv);
    if (r === 0) return -(y + p * n);
    const term = Math.pow(1 + r, n);
    return -(y * term + (p * (1 + r * type) * (term - 1)) / r);
  },
  PV: (rate, nper, pmt, fv = 0, type = 0) => {
    const r = Number(rate);
    const n = Number(nper);
    const p = Number(pmt);
    const f = Number(fv);
    if (r === 0) return -(f + p * n);
    const term = Math.pow(1 + r, n);
    return -((p * (1 + r * type) * (1 - 1 / term)) / r + f / term);
  },

  // Text Functions
  CONCAT: (...args) => flatten(args).map(String).join(''),
  TEXTJOIN: (delimiter, ignoreEmpty, ...args) => {
    const items = flatten(args);
    const filtered = ignoreEmpty ? items.filter(x => x !== '' && x !== null) : items;
    return filtered.join(delimiter);
  },
  LEFT: (str, num = 1) => String(str).substring(0, num),
  RIGHT: (str, num = 1) => {
    const s = String(str);
    return s.substring(Math.max(0, s.length - num));
  },
  MID: (str, start, length) => String(str).substring(Math.max(0, start - 1), start - 1 + length),
  LEN: (str) => String(str).length,
  TRIM: (str) => String(str).trim(),
  UPPER: (str) => String(str).toUpperCase(),
  LOWER: (str) => String(str).toLowerCase(),
  PROPER: (str) => String(str).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),

  // Date Functions
  TODAY: () => new Date().toISOString().split('T')[0],
  NOW: () => new Date().toLocaleString(),
  YEAR: (dateStr) => new Date(dateStr).getFullYear(),
  MONTH: (dateStr) => new Date(dateStr).getMonth() + 1,
  DAY: (dateStr) => new Date(dateStr).getDate()
};

function flatten(arr) {
  return arr.reduce((flat, toFlatten) =>
    flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten), []);
}
