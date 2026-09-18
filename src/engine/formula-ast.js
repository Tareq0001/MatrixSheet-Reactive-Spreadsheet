/**
 * MatrixSheet - Lexer, Recursive-Descent AST Formula Parser & Evaluator
 */
import { ExcelFunctions } from './excel-functions.js';

export class FormulaAST {
  constructor(sheetResolver) {
    this.resolver = sheetResolver;
  }

  evaluate(formulaStr, activeSheet = 'Sheet1') {
    if (!formulaStr.startsWith('=')) {
      return isNaN(formulaStr) ? formulaStr : Number(formulaStr);
    }

    const cleanFormula = formulaStr.slice(1).trim();
    const tokens = this.tokenize(cleanFormula, activeSheet);
    const parser = new ASTParser(tokens);
    const ast = parser.parse();
    return this.evalAST(ast, activeSheet);
  }

  extractDependencies(formulaStr, activeSheet = 'Sheet1') {
    if (!formulaStr.startsWith('=')) return [];
    try {
      const tokens = this.tokenize(formulaStr.slice(1).trim(), activeSheet);
      const deps = new Set();
      tokens.forEach(tok => {
        if (tok.type === 'CELL_REF') {
          deps.add(tok.sheet ? `${tok.sheet}!${tok.col}${tok.row}` : `${activeSheet}!${tok.col}${tok.row}`);
        } else if (tok.type === 'CELL_RANGE') {
          const rangeCells = this.expandRange(tok.start, tok.end, tok.sheet || activeSheet);
          rangeCells.forEach(c => deps.add(c));
        }
      });
      return Array.from(deps);
    } catch {
      return [];
    }
  }

  expandRange(start, end, sheet) {
    const colStart = this.colToNum(start.col);
    const colEnd = this.colToNum(end.col);
    const rowStart = Math.min(start.row, end.row);
    const rowEnd = Math.max(start.row, end.row);

    const cells = [];
    for (let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) {
      const colLetter = this.numToCol(c);
      for (let r = rowStart; r <= rowEnd; r++) {
        cells.push(`${sheet}!${colLetter}${r}`);
      }
    }
    return cells;
  }

  tokenize(str, activeSheet) {
    const tokens = [];
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/\d/.test(char) || (char === '.' && /\d/.test(str[i + 1]))) {
        let numStr = '';
        while (i < str.length && /[0-9.]/.test(str[i])) {
          numStr += str[i++];
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        let s = '';
        i++;
        while (i < str.length && str[i] !== quote) {
          s += str[i++];
        }
        i++;
        tokens.push({ type: 'STRING', value: s });
        continue;
      }

      if (char === ':') { tokens.push({ type: 'COLON' }); i++; continue; }
      if (char === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }
      if (char === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
      if (char === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

      if (['+', '-', '*', '/', '^', '%'].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      if (char === '=' || char === '<' || char === '>') {
        let op = char;
        if (str[i + 1] === '=' || (char === '<' && str[i + 1] === '>')) {
          op += str[i + 1];
          i += 2;
        } else {
          i++;
        }
        tokens.push({ type: 'COMPARISON', value: op });
        continue;
      }

      if (/[A-Za-z_$]/.test(char)) {
        let ident = '';
        while (i < str.length && /[A-Za-z0-9_!$]/.test(str[i])) {
          ident += str[i++];
        }

        let sheet = null;
        let refPart = ident;
        if (ident.includes('!')) {
          const parts = ident.split('!');
          sheet = parts[0];
          refPart = parts[1];
        }

        const cellMatch = refPart.match(/^(\$?)([A-Za-z]+)(\$?)(\d+)$/);
        if (cellMatch) {
          tokens.push({
            type: 'CELL_REF',
            col: cellMatch[2].toUpperCase(),
            row: parseInt(cellMatch[4], 10),
            isColAbsolute: !!cellMatch[1],
            isRowAbsolute: !!cellMatch[3],
            sheet: sheet || activeSheet
          });
        } else {
          const upper = ident.toUpperCase();
          if (upper === 'TRUE') tokens.push({ type: 'BOOLEAN', value: true });
          else if (upper === 'FALSE') tokens.push({ type: 'BOOLEAN', value: false });
          else tokens.push({ type: 'FUNCTION', name: upper });
        }
        continue;
      }

      i++;
    }

    const fused = [];
    for (let j = 0; j < tokens.length; j++) {
      if (tokens[j].type === 'CELL_REF' && tokens[j + 1]?.type === 'COLON' && tokens[j + 2]?.type === 'CELL_REF') {
        fused.push({
          type: 'CELL_RANGE',
          start: tokens[j],
          end: tokens[j + 2],
          sheet: tokens[j].sheet
        });
        j += 2;
      } else {
        fused.push(tokens[j]);
      }
    }

    return fused;
  }

  evalAST(node, activeSheet) {
    if (!node) return 0;
    if (node.type === 'NUMBER' || node.type === 'STRING' || node.type === 'BOOLEAN') {
      return node.value;
    }
    if (node.type === 'CELL_REF') {
      const key = `${node.sheet || activeSheet}!${node.col}${node.row}`;
      return this.resolver(key);
    }
    if (node.type === 'CELL_RANGE') {
      const cells = this.expandRange(node.start, node.end, node.sheet || activeSheet);
      return cells.map(key => this.resolver(key));
    }
    if (node.type === 'UNARY') {
      const val = this.evalAST(node.arg, activeSheet);
      return node.op === '-' ? -val : val;
    }
    if (node.type === 'BINARY') {
      const left = this.evalAST(node.left, activeSheet);
      const right = this.evalAST(node.right, activeSheet);
      switch (node.op) {
        case '+': return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/':
          if (Number(right) === 0) throw new Error('#DIV/0!');
          return Number(left) / Number(right);
        case '^': return Math.pow(Number(left), Number(right));
        case '=': return left == right;
        case '<>': return left != right;
        case '<': return Number(left) < Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>': return Number(left) > Number(right);
        case '>=': return Number(left) >= Number(right);
      }
    }
    if (node.type === 'FUNCTION_CALL') {
      const fn = ExcelFunctions[node.name];
      if (!fn) throw new Error('#NAME?');
      const evaluatedArgs = node.args.map(arg => this.evalAST(arg, activeSheet));
      return fn(...evaluatedArgs);
    }
    return 0;
  }

  colToNum(col) {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
  }

  numToCol(num) {
    let str = '';
    while (num > 0) {
      const rem = (num - 1) % 26;
      str = String.fromCharCode(65 + rem) + str;
      num = Math.floor((num - 1) / 26);
    }
    return str;
  }
}

class ASTParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }

  parse() {
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddSub();
    while (this.peek() && this.peek().type === 'COMPARISON') {
      const op = this.consume().value;
      const right = this.parseAddSub();
      left = { type: 'BINARY', op, left, right };
    }
    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.peek() && this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      left = { type: 'BINARY', op, left, right };
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parseExponent();
    while (this.peek() && this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseExponent();
      left = { type: 'BINARY', op, left, right };
    }
    return left;
  }

  parseExponent() {
    let left = this.parseUnary();
    while (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { type: 'BINARY', op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const op = this.consume().value;
      const arg = this.parseUnary();
      return { type: 'UNARY', op, arg };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const tok = this.peek();
    if (!tok) return null;

    if (tok.type === 'NUMBER' || tok.type === 'STRING' || tok.type === 'BOOLEAN' || tok.type === 'CELL_REF' || tok.type === 'CELL_RANGE') {
      return this.consume();
    }

    if (tok.type === 'FUNCTION') {
      const name = this.consume().name;
      this.expect('LPAREN');
      const args = [];
      while (this.peek() && this.peek().type !== 'RPAREN') {
        args.push(this.parseComparison());
        if (this.peek() && this.peek().type === 'COMMA') {
          this.consume();
        }
      }
      this.expect('RPAREN');
      return { type: 'FUNCTION_CALL', name, args };
    }

    if (tok.type === 'LPAREN') {
      this.consume();
      const expr = this.parseComparison();
      this.expect('RPAREN');
      return expr;
    }

    throw new Error('#VALUE!');
  }

  expect(type) {
    const tok = this.consume();
    if (!tok || tok.type !== type) {
      throw new Error(`Expected ${type}`);
    }
    return tok;
  }
}
