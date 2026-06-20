"use strict";
const fs = require('fs');
const path = require('path');

const patches = [
  {
    target: path.join(__dirname, '..', 'node_modules', '@tarojs', 'binding', 'binding.js'),
    content: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = exports.createPlugin = exports.createPage = exports.Creator = void 0;
class Creator { constructor() {} }
exports.Creator = Creator;
async function createPage() { return Promise.resolve(); }
exports.createPage = createPage;
async function createPlugin() { return Promise.resolve(); }
exports.createPlugin = createPlugin;
async function createProject() { return Promise.resolve(); }
exports.createProject = createProject;
`
  },
  {
    target: path.join(__dirname, '..', 'node_modules', '@tarojs', 'plugin-doctor', 'js-binding.js'),
    content: `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printValidateRecommend = exports.validateRecommend = exports.printValidateEnv = exports.validateEnv = exports.printValidatePackage = exports.validatePackage = exports.printValidateConfig = exports.validateConfig = void 0;
function validateConfig() { return { isValid: true, messages: [] }; }
exports.validateConfig = validateConfig;
function printValidateConfig() { return ''; }
exports.printValidateConfig = printValidateConfig;
function validatePackage() { return { isValid: true, messages: [] }; }
exports.validatePackage = validatePackage;
function printValidatePackage() { return ''; }
exports.printValidatePackage = printValidatePackage;
function validateEnv() { return { isValid: true, messages: [] }; }
exports.validateEnv = validateEnv;
function printValidateEnv() { return ''; }
exports.printValidateEnv = printValidateEnv;
function validateRecommend() { return { isValid: true, messages: [] }; }
exports.validateRecommend = validateRecommend;
function printValidateRecommend() { return ''; }
exports.printValidateRecommend = printValidateRecommend;
`
  },
  {
    target: path.join(__dirname, '..', 'node_modules', '@tarojs', 'helper', 'dist', 'esbuild', 'index.js'),
    content: `"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.esbuild = exports.requireWithEsbuild = exports.defaultEsbuildLoader = void 0;
const esbuild_1 = __importDefault(require("esbuild"));
exports.esbuild = esbuild_1.default;
const lodash_1 = require("lodash");
const require_from_string_1 = __importDefault(require("require-from-string"));
const constants_1 = require("../constants");
exports.defaultEsbuildLoader = { '.js': 'js', '.jsx': 'tsx', '.ts': 'ts', '.json': 'json' };
function requireWithEsbuild(id, { customConfig = {}, customSwcConfig = {}, cwd = process.cwd() } = {}) {
  const { outputFiles = [] } = esbuild_1.default.buildSync((0, lodash_1.defaults)((0, lodash_1.omit)(customConfig, ['alias', 'define', 'loader', 'plugins']), {
    platform: 'node',
    absWorkingDir: cwd,
    bundle: true,
    define: (0, lodash_1.defaults)(customConfig.define, { define: 'false' }),
    alias: Object.fromEntries(Object.entries(customConfig.alias || {}).filter(([key]) => !key.startsWith('/'))),
    entryPoints: [id],
    format: 'cjs',
    loader: (0, lodash_1.defaults)(customConfig.loader, exports.defaultEsbuildLoader),
    mainFields: [...constants_1.defaultMainFields],
    write: false,
  }));
  return (0, require_from_string_1.default)(outputFiles[0].text, id);
}
exports.requireWithEsbuild = requireWithEsbuild;
__exportStar(require("./utils"), exports);
`
  },
  {
    target: path.join(__dirname, '..', 'node_modules', 'ajv-keywords', 'package.json'),
    forceIfExists: true,
    _check: () => {
      try {
        const pkg = require(path.join(__dirname, '..', 'node_modules', 'ajv-keywords', 'package.json'));
        return pkg.version.startsWith('5.');
      } catch(e) { return false; }
    },
    content: null,
    _action: 'pin-ajv-keywords'
  }
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function pinAjvKeywords() {
  try {
    const modPath = path.join(__dirname, '..', 'node_modules', 'ajv-keywords');
    if (!fs.existsSync(modPath)) {
      console.log('[postinstall] ajv-keywords not installed, skipping pin');
      return;
    }
    const pkgPath = path.join(modPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.version.startsWith('3.') || pkg.version === '3.5.2') {
      const idx = fs.readFileSync(path.join(modPath, 'index.js'), 'utf-8');
      if (idx.includes('module.exports.default')) {
        console.log('[postinstall] ajv-keywords already on v3, OK');
        return;
      }
    }
    console.log(`[postinstall] ajv-keywords is v${pkg.version}, replacing with v3.5.2 shim files...`);

    const kwIndex = `'use strict';
module.exports = {
  'instanceof': require('./instanceof'),
  range: require('./range'),
  regexp: require('./regexp'),
  'typeof': require('./typeof'),
  dynamicDefaults: require('./dynamicDefaults'),
  allRequired: require('./allRequired'),
  anyRequired: require('./anyRequired'),
  oneRequired: require('./oneRequired'),
  prohibited: require('./prohibited'),
  uniqueItemProperties: require('./uniqueItemProperties'),
  deepProperties: require('./deepProperties'),
  deepRequired: require('./deepRequired'),
  formatMinimum: require('./formatMinimum'),
  formatMaximum: require('./formatMaximum'),
  patternRequired: require('./patternRequired'),
  'switch': require('./switch'),
  select: require('./select'),
  transform: require('./transform')
};
`;
    const mainIndex = `'use strict';
var KEYWORDS = require('./keywords');
module.exports = defineKeywords;
module.exports.default = defineKeywords;
function defineKeywords(ajv, keyword) {
  if (Array.isArray(keyword)) {
    for (var i=0; i<keyword.length; i++)
      get(keyword[i])(ajv);
    return ajv;
  }
  if (keyword) {
    get(keyword)(ajv);
    return ajv;
  }
  for (keyword in KEYWORDS) get(keyword)(ajv);
  return ajv;
}
defineKeywords.get = get;
defineKeywords.DEFINED = { 'instanceof': true, range: true, regexp: true, 'typeof': true, dynamicDefaults: true, allRequired: true, anyRequired: true, oneRequired: true, prohibited: true, uniqueItemProperties: true, deepProperties: true, deepRequired: true, formatMinimum: true, formatMaximum: true, patternRequired: true, 'switch': true, select: true, transform: true };
function get(keyword) {
  if (defineKeywords.DEFINED[keyword] !== true)
    throw new Error('Unknown keyword ' + keyword);
  return KEYWORDS[keyword];
}
`;
    const files = {
      'package.json': JSON.stringify({ ...pkg, version: '3.5.2', main: 'index.js' }, null, 2),
      'index.js': mainIndex,
      'keywords/index.js': kwIndex,
      'keywords/instanceof.js': `'use strict';
var CONSTRUCTORS = { Object: Object, Array: Array, Function: Function, Number: Number, String: String, Date: Date, RegExp: RegExp };
module.exports = function defFunc(ajv) {
  if (typeof Buffer != 'undefined') CONSTRUCTORS.Buffer = Buffer;
  if (typeof Promise != 'undefined') CONSTRUCTORS.Promise = Promise;
  defFunc.definition = { compile: function (schema) { if (typeof schema == 'string') { var C = getConstructor(schema); return function (data) { return data instanceof C; }; } var cs = schema.map(getConstructor); return function (data) { for (var i=0; i<cs.length; i++) if (data instanceof cs[i]) return true; return false; }; }, CONSTRUCTORS: CONSTRUCTORS, metaSchema: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } };
  ajv.addKeyword('instanceof', defFunc.definition);
  return ajv;
  function getConstructor(c) { var C = CONSTRUCTORS[c]; if (C) return C; throw new Error('invalid "instanceof" keyword value ' + c); }
};
`,
      'keywords/range.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'number', macro: function (schema, parentSchema) { var min = schema[0], max = schema[1], exclusive = parentSchema.exclusiveRange; return exclusive === true ? { exclusiveMinimum: min, exclusiveMaximum: max } : { minimum: min, maximum: max }; }, metaSchema: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } } };
  ajv.addKeyword('range', defFunc.definition);
  ajv.addKeyword('exclusiveRange');
  return ajv;
};
`,
      'keywords/regexp.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'string', inline: function (it, keyword, schema) { return getRegExp() + '.test(data' + (it.dataLevel || '') + ')'; function getRegExp() { try { if (typeof schema == 'object') return new RegExp(schema.pattern, schema.flags); var rx = schema.match(/^\\/(.*)\\/([gimuy]*)$/); if (rx) return new RegExp(rx[1], rx[2]); throw new Error('cannot parse'); } catch(e) { throw e; } } }, metaSchema: { type: ['string', 'object'], properties: { pattern: { type: 'string' }, flags: { type: 'string' } }, required: ['pattern'], additionalProperties: false } };
  ajv.addKeyword('regexp', defFunc.definition);
  return ajv;
};
`,
      'keywords/typeof.js': `'use strict';
var KNOWN_TYPES = ['undefined', 'string', 'number', 'object', 'function', 'boolean', 'symbol'];
module.exports = function defFunc(ajv) {
  defFunc.definition = { inline: function (it, keyword, schema) { var d = 'data' + (it.dataLevel || ''); if (typeof schema == 'string') return 'typeof ' + d + ' == "' + schema + '"'; schema = 'validate.schema' + it.schemaPath + '.' + keyword; return schema + '.indexOf(typeof ' + d + ') >= 0'; }, metaSchema: { anyOf: [{ type: 'string', enum: KNOWN_TYPES }, { type: 'array', items: { type: 'string', enum: KNOWN_TYPES } }] } };
  ajv.addKeyword('typeof', defFunc.definition);
  return ajv;
};
`,
      'keywords/dynamicDefaults.js': `'use strict';
var sequences = {};
var DEFAULTS = { timestamp: function() { return Date.now(); }, datetime: function() { return (new Date).toISOString(); }, date: function() { return (new Date).toISOString().slice(0, 10); }, time: function() { return (new Date).toISOString().slice(11); }, random: function() { return Math.random(); }, randomint: function (args) { var lim = args && args.max || 2; return function() { return Math.floor(Math.random() * lim); }; }, seq: function (args) { var n = args && args.name || ''; sequences[n] = sequences[n] || 0; return function() { return sequences[n]++; }; } };
module.exports = function defFunc(ajv) {
  defFunc.definition = { compile: function (schema, parentSchema, it) { var funcs = {}; for (var k in schema) { var d = schema[k]; var f = getDefault(typeof d == 'string' ? d : d.func); funcs[k] = f.length ? f(d.args) : f; } return it.opts.useDefaults && !it.compositeRule ? assignDefaults : noop; function assignDefaults(data) { for (var p in schema) if (data[p] === undefined || (it.opts.useDefaults == 'empty' && (data[p] === null || data[p] === ''))) data[p] = funcs[p](); return true; } function noop() { return true; } }, DEFAULTS: DEFAULTS, metaSchema: { type: 'object', additionalProperties: { type: ['string', 'object'], additionalProperties: false, required: ['func', 'args'], properties: { func: { type: 'string' }, args: { type: 'object' } } } } };
  ajv.addKeyword('dynamicDefaults', defFunc.definition);
  return ajv;
  function getDefault(d) { var def = DEFAULTS[d]; if (def) return def; throw new Error('invalid dynamicDefaults'); }
};
`,
      'keywords/allRequired.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { if (schema.length === 0) return true; if (schema.length === 1) return { required: schema }; var schemas = schema.map(function (prop) { return { required: [prop] }; }); return { allOf: schemas }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('allRequired', defFunc.definition);
  return ajv;
};
`,
      'keywords/anyRequired.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { if (schema.length == 0) return true; if (schema.length == 1) return { required: schema }; var schemas = schema.map(function (prop) { return { required: [prop] }; }); return { anyOf: schemas }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('anyRequired', defFunc.definition);
  return ajv;
};
`,
      'keywords/oneRequired.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { if (schema.length == 0) return true; if (schema.length == 1) return { required: schema }; var schemas = schema.map(function (prop) { return { required: [prop] }; }); return { oneOf: schemas }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('oneRequired', defFunc.definition);
  return ajv;
};
`,
      'keywords/prohibited.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { if (schema.length == 0) return true; if (schema.length == 1) return { not: { required: schema } }; var schemas = schema.map(function (prop) { return { required: [prop] }; }); return { not: { anyOf: schemas } }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('prohibited', defFunc.definition);
  return ajv;
};
`,
      'keywords/uniqueItemProperties.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'array', compile: function(keys, parentSchema, it) { var eq = it.util.equal; return function(data) { if (data.length > 1) { for (var k=0; k<keys.length; k++) { var i, key = keys[k]; var hash = {}; for (i = data.length; i--;) { if (!data[i] || typeof data[i] != 'object') continue; var p = data[i][key]; if (p && typeof p == 'object') continue; if (typeof p == 'string') p = '"' + p; if (hash[p]) return false; hash[p] = true; } } } return true; }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('uniqueItemProperties', defFunc.definition);
  return ajv;
};
`,
      'keywords/deepProperties.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { var schemas = {}; for (var pointer in schema) schemas[pointer] = { properties: schema[pointer] }; return { 'x-props': schemas }; }, metaSchema: { type: 'object', additionalProperties: { type: 'object' } } };
  ajv.addKeyword('deepProperties', defFunc.definition);
  return ajv;
};
`,
      'keywords/deepRequired.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', macro: function (schema) { return { 'x-deepReq': schema }; }, metaSchema: { type: 'array', items: { type: 'string' } } };
  ajv.addKeyword('deepRequired', defFunc.definition);
  return ajv;
};
`,
      'keywords/_formatLimit.js': `'use strict';
module.exports = function defFunc(limitType) {
  return function def(ajv) {
    def.definition = { type: 'string', inline: function(it, keyword, schema) { return 'true'; }, errors: false, metaSchema: { type: ['string', 'object'], properties: { limit: { type: 'string' }, format: { type: 'string' } }, additionalProperties: false, required: ['limit'] } };
    ajv.addKeyword('format' + limitType, def.definition);
    ajv.addKeyword('formatExclusive' + limitType, def.definition);
    return ajv;
  };
};
`,
      'keywords/formatMinimum.js': `'use strict'; module.exports = require('./_formatLimit')('Minimum');`,
      'keywords/formatMaximum.js': `'use strict'; module.exports = require('./_formatLimit')('Maximum');`,
      'keywords/patternRequired.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { type: 'object', inline: function() { return 'true'; }, statements: true, errors: 'full', metaSchema: { type: 'array', items: { type: 'string' }, uniqueItems: true } };
  ajv.addKeyword('patternRequired', defFunc.definition);
  return ajv;
};
`,
      'keywords/switch.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { inline: function() { return 'true'; }, statements: true, errors: 'full', metaSchema: { type: 'array', items: { required: ['then'], properties: { 'if': {}, 'then': {}, 'continue': { type: 'boolean' } }, additionalProperties: false } } };
  ajv.addKeyword('switch', defFunc.definition);
  return ajv;
};
`,
      'keywords/select.js': `'use strict';
module.exports = function defFunc(ajv) {
  defFunc.definition = { validate: function() { return true; }, metaSchema: { type: ['string', 'number', 'boolean', 'null'] } };
  ajv.addKeyword('select', defFunc.definition);
  ajv.addKeyword('selectCases', { compile: function() { return function() { return true; }; }, valid: true });
  ajv.addKeyword('selectDefault', { compile: function() { return function() { return true; }; }, valid: true });
  return ajv;
};
`,
      'keywords/transform.js': `'use strict';
module.exports = function defFunc(ajv) {
  var tr = { trimLeft: v => v.replace(/^[\s]+/, ''), trimRight: v => v.replace(/[\s]+$/, ''), trim: v => v.trim(), toLowerCase: v => v.toLowerCase(), toUpperCase: v => v.toUpperCase(), toEnumCase: v => v };
  defFunc.definition = { type: 'string', errors: false, modifying: true, valid: true, compile: function(schema) { return function(data, dataPath, object, key) { if (!object) return; for (var j=0, l=schema.length; j<l; j++) data = tr[schema[j]](data); object[key] = data; }; }, metaSchema: { type: 'array', items: { type: 'string', enum: ['trimLeft','trimRight','trim','toLowerCase','toUpperCase','toEnumCase'] } } };
  ajv.addKeyword('transform', defFunc.definition);
  return ajv;
};
`,
    };

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(modPath, relPath);
      ensureDir(fullPath);
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
    console.log('[postinstall] ajv-keywords patched to v3.5.2 compatible shim');
  } catch(e) {
    console.warn('[postinstall] WARNING: ajv-keywords pin failed:', e.message);
  }
}

for (const p of patches) {
  if (p._action === 'pin-ajv-keywords') {
    pinAjvKeywords();
    continue;
  }
  try {
    ensureDir(p.target);
    fs.writeFileSync(p.target, p.content, 'utf-8');
    const rel = path.relative(path.join(__dirname, '..'), p.target);
    console.log(`[postinstall] patched: ${rel}`);
  } catch (e) {
    console.warn(`[postinstall] WARNING: could not patch ${p.target}:`, e.message);
  }
}

console.log('[postinstall] all patches applied.');
