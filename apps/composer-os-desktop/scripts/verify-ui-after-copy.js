/**
 * Post-copy verification: requires compiled dist/uiBundleVerify.js (run after tsc).
 */
const path = require('path');
const { verifyUiBundleAtPath } = require('../dist/uiBundleVerify');

const uiDir = path.join(__dirname, '..', 'resources', 'ui');
const r = verifyUiBundleAtPath(uiDir);
if (!r.ok) {
  console.error('resources/ui verification failed:', r.reason);
  console.error('Path:', r.resolvedPath);
  process.exit(1);
}
console.log('Verified Composer OS UI stamp at resources/ui:', r.stamp.productId, r.stamp.buildTimestamp);
