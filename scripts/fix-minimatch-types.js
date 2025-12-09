const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '../node_modules/@types/minimatch/index.d.ts');
const typesDir = path.dirname(typesPath);

if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

const typeDefinition = `// Type definitions for minimatch
declare module 'minimatch' {
  export function minimatch(target: string, pattern: string, options?: any): boolean;
  export class Minimatch {
    constructor(pattern: string, options?: any);
    match(fname: string): boolean;
    makeRe(): RegExp | false;
    debug(): void;
  }
}
`;

fs.writeFileSync(typesPath, typeDefinition);
console.log('Fixed @types/minimatch type definitions');
