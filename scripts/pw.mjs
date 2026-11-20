// Playwright for the check scripts: the project's own copy if installed
// (npm i -D playwright), otherwise a shared one.
import {createRequire} from 'node:module';
const local = createRequire(import.meta.url);
let pw;
try {
  pw = local('playwright');
} catch {
  pw = createRequire('/opt/npm-tools/node_modules/')('playwright');
}
export const {chromium} = pw;
