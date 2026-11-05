const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) res.push(...walk(fp));
    else if (fp.endsWith('.js') || fp.endsWith('.jsx')) res.push(fp);
  }
  return res;
}

const files = walk('src');

// Common JS/Browser globals
const BUILTINS = new Set([
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'alert', 'confirm', 'prompt',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'atob', 'btoa', 'String', 'Number', 'Boolean', 'Array', 'Object',
  'Function', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'Promise',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt', 'Math', 'JSON', 'console',
  'window', 'document', 'navigator', 'history', 'location', 'localStorage', 'sessionStorage',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'Headers', 'Request', 'Response',
  'AbortController', 'CustomEvent', 'Event', 'MutationObserver', 'IntersectionObserver',
  'ResizeObserver', 'Image', 'Audio', 'FileReader', 'crypto', 'performance', 'queueMicrotask',
  'structuredClone', 'require', 'import', 'super', 'eval'
]);

const suspicious = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all function calls: identifier followed immediately by '('
  // Exclude keywords like if, for, while, switch, catch, return, typeof, function
  const callRegex = /(?<![.\w$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let match;
  const calls = new Set();
  while ((match = callRegex.exec(content)) !== null) {
    const fn = match[1];
    if (['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function', 'async'].includes(fn)) continue;
    if (BUILTINS.has(fn)) continue;
    calls.add(fn);
  }

  for (const fn of calls) {
    // Check if defined in file:
    // function fn(...) or const/let/var fn = or const/let/var [..., fn] or ({ ..., fn })
    const isDeclared = 
      new RegExp(`(?:function|const|let|var|class)\\s+${fn}\\b`).test(content) ||
      new RegExp(`[{\\s,]${fn}[\\s,:}]`).test(content) || // object destructuring or param
      new RegExp(`\\[[^\\]]*\\b${fn}\\b[^\\]]*\\]\\s*=`).test(content) || // array destructuring
      new RegExp(`import\\s*(?:\\*\\s+as\\s+\\w+,\\s*)?\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from`).test(content) ||
      new RegExp(`import\\s+${fn}\\b`).test(content) ||
      new RegExp(`\\b${fn}\\s*=>`).test(content) ||
      new RegExp(`\\bfunction\\s*\\([^)]*\\b${fn}\\b`).test(content) ||
      new RegExp(`\\((?:[^)]*,\\s*)?${fn}(?:\\s*,[^)]*)?\\)\\s*=>`).test(content);

    if (!isDeclared) {
      suspicious.push({ file, fn });
    }
  }
}

console.log(JSON.stringify(suspicious, null, 2));

