/**
 * formulaEngine.js — Motor de fórmulas tipo Excel (sin eval)
 *
 * Soporta:
 *  - Aritmética: +  -  *  /  ^
 *  - Paréntesis
 *  - Literales numéricos y de texto ("...")
 *  - Referencias por nombre de campo: meta_fisica_2025
 *  - Referencias por letra de columna: G5 → columna G, fila 5 (sólo columna usada)
 *  - Funciones: LEAST GREATEST MIN MAX ROUND ABS IF SUM AVG COALESCE IFERROR
 *  - Comparaciones en IF: <  >  <=  >=  =  <>
 */

// ── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(src) {
  const tokens = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    // Whitespace
    if (/\s/.test(c)) { i++; continue; }

    // Numbers
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      tokens.push({ type: 'NUM', value: parseFloat(num) });
      continue;
    }

    // Strings "..."
    if (c === '"') {
      let str = '';
      i++;
      while (i < src.length && src[i] !== '"') str += src[i++];
      i++; // closing "
      tokens.push({ type: 'STR', value: str });
      continue;
    }

    // Identifiers and cell references (A1, AA1, fieldName_2025, etc.)
    if (/[A-Za-z_]/.test(c)) {
      let id = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++];
      // If followed by '(' → function call
      if (src[i] === '(') {
        tokens.push({ type: 'FUNC', value: id.toUpperCase() });
      } else {
        tokens.push({ type: 'REF', value: id });
      }
      continue;
    }

    // Two-char operators
    if (c === '<' && src[i + 1] === '>') { tokens.push({ type: 'OP', value: '<>' }); i += 2; continue; }
    if (c === '<' && src[i + 1] === '=') { tokens.push({ type: 'OP', value: '<=' }); i += 2; continue; }
    if (c === '>' && src[i + 1] === '=') { tokens.push({ type: 'OP', value: '>=' }); i += 2; continue; }

    // Single-char operators and punctuation
    if (/[+\-*/^(),:<>=]/.test(c)) { tokens.push({ type: 'OP', value: c }); i++; continue; }
    if (c === ';') { tokens.push({ type: 'OP', value: ',' }); i++; continue; } // ';' → ',' alias

    i++; // skip unknown characters
  }

  return tokens;
}

// ── Parser (recursive descent) ────────────────────────────────────────────────

function createParser(tokens, ctx) {
  let pos = 0;

  const peek  = () => tokens[pos];
  const next  = () => tokens[pos++];
  const eat   = (val) => { if (peek()?.value !== val) throw new Error(`Expected '${val}'`); return next(); };

  function parseExpr() {
    return parseComparison();
  }

  function parseComparison() {
    let left = parseAddSub();
    const CMP_OPS = ['<', '>', '<=', '>=', '=', '<>'];
    while (CMP_OPS.includes(peek()?.value)) {
      const op = next().value;
      const right = parseAddSub();
      switch (op) {
        case '<':  left = left <  right ? 1 : 0; break;
        case '>':  left = left >  right ? 1 : 0; break;
        case '<=': left = left <= right ? 1 : 0; break;
        case '>=': left = left >= right ? 1 : 0; break;
        case '=':  left = left === right ? 1 : 0; break;
        case '<>': left = left !== right ? 1 : 0; break;
      }
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek()?.value === '+' || peek()?.value === '-') {
      const op = next().value;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePower();
    while (peek()?.value === '*' || peek()?.value === '/') {
      const op = next().value;
      const right = parsePower();
      if (op === '*') left = left * right;
      else left = right !== 0 ? left / right : 0;
    }
    return left;
  }

  function parsePower() {
    let base = parseUnary();
    if (peek()?.value === '^') { next(); return Math.pow(base, parseUnary()); }
    return base;
  }

  function parseUnary() {
    if (peek()?.value === '-') { next(); return -parsePrimary(); }
    if (peek()?.value === '+') { next(); return parsePrimary(); }
    return parsePrimary();
  }

  function parseArgs() {
    const args = [];
    if (peek()?.value !== ')') {
      args.push(parseExpr());
      while (peek()?.value === ',') { next(); args.push(parseExpr()); }
    }
    return args;
  }

  function callFn(name, args) {
    const nums = args.map(a => (a === null || a === undefined ? null : Number(a)));
    const valid = nums.filter(n => n != null && !isNaN(n));
    switch (name) {
      case 'MIN':
      case 'LEAST':      return valid.length ? Math.min(...valid) : 0;
      case 'MAX':
      case 'GREATEST':   return valid.length ? Math.max(...valid) : 0;
      case 'ROUND':      return Math.round((nums[0] ?? 0) * 10 ** (nums[1] ?? 0)) / 10 ** (nums[1] ?? 0);
      case 'ABS':        return Math.abs(nums[0] ?? 0);
      case 'SQRT':       return Math.sqrt(nums[0] ?? 0);
      case 'IF':         return args[0] ? (args[1] ?? 0) : (args[2] ?? 0);
      case 'SUM':        return valid.reduce((s, n) => s + n, 0);
      case 'AVG':
      case 'AVERAGE':    return valid.length ? valid.reduce((s, n) => s + n, 0) / valid.length : 0;
      case 'COALESCE':   return args.find(a => a != null && a !== '') ?? 0;
      case 'IFERROR':    return args[0] ?? args[1] ?? 0;
      case 'CONCAT':     return args.map(String).join('');
      case 'LEN':        return String(args[0] ?? '').length;
      case 'UPPER':      return String(args[0] ?? '').toUpperCase();
      case 'LOWER':      return String(args[0] ?? '').toLowerCase();
      default:           return 0;
    }
  }

  function resolveRef(id) {
    // 1. Exact field name match in context
    if (Object.prototype.hasOwnProperty.call(ctx, id)) {
      const v = ctx[id];
      return v === null || v === undefined ? 0 : Number(v) || 0;
    }
    // 2. Cell reference A-Z (single/double letter + optional row digits, e.g. G, G5, AA2)
    const colMatch = id.match(/^([A-Z]+)(\d*)$/);
    if (colMatch) {
      const colKey = colMatch[1];
      return ctx.__colRef?.(colKey) ?? 0;
    }
    // 3. Case-insensitive field lookup
    const lc = id.toLowerCase();
    const found = Object.keys(ctx).find(k => k.toLowerCase() === lc);
    if (found) return Number(ctx[found]) || 0;
    return 0;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'NUM') { next(); return t.value; }
    if (t.type === 'STR') { next(); return t.value; }

    if (t.type === 'FUNC') {
      next();
      eat('(');
      const args = parseArgs();
      eat(')');
      return callFn(t.value, args);
    }

    if (t.type === 'REF') {
      next();
      return resolveRef(t.value);
    }

    if (t.type === 'OP' && t.value === '(') {
      next();
      const val = parseExpr();
      eat(')');
      return val;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  return { parseExpr };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Evalúa una fórmula dentro del contexto de una fila del grid.
 *
 * @param {string} formula - Puede ser '=expr' o un valor literal
 * @param {object} rowData - Datos de la fila (campo → valor)
 * @param {function} colRefFn - (colLetter) => value — resuelve referencias tipo 'G' → campo de la columna G
 * @returns {number|string} Resultado evaluado, o '#ERR' si hay error de sintaxis
 */
export function evalFormula(formula, rowData = {}, colRefFn = null) {
  if (typeof formula !== 'string' || !formula.startsWith('=')) return formula;
  const expr = formula.slice(1).trim();
  if (!expr) return 0;

  const ctx = {
    ...rowData,
    __colRef: colRefFn,
  };

  try {
    const tokens = tokenize(expr);
    const parser = createParser(tokens, ctx);
    return parser.parseExpr();
  } catch {
    return '#ERR';
  }
}

/**
 * Verifica si un string es una fórmula (empieza con '=').
 */
export const isFormula = s => typeof s === 'string' && s.startsWith('=');

/**
 * Formatea un valor numérico para mostrar en celda.
 */
export function fmtCell(value, type) {
  if (value === null || value === undefined || value === '') return '';
  if (value === '#ERR') return '#ERR';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  switch (type) {
    case 'pct':    return `${Math.round(n * 100)}%`;
    case 'pct1':   return `${n.toFixed(1)}%`;
    case 'pct100': return `${Math.round(n * 100)}%`;
    case 'int':    return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    case 'num2':   return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
    case 'money_m':
      return `$${Math.round(n).toLocaleString('es-CO')}`;
    default:       return n % 1 === 0 ? n.toLocaleString('es-CO') : n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }
}
