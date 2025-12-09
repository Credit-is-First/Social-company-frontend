// Type definitions for minimatch - prevents TS2688 error
declare namespace minimatch {
  function minimatch(target: string, pattern: string, options?: any): boolean;
  class Minimatch {
    constructor(pattern: string, options?: any);
    match(fname: string): boolean;
    makeRe(): RegExp | false;
    debug(): void;
  }
}

declare module 'minimatch' {
  export = minimatch;
}
