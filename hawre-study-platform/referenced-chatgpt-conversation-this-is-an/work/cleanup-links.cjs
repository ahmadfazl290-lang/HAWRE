const fs = require('fs');
const path = require('path');
const root = path.resolve('outputs/study-platform');
for (const relative of ['outputs/study-platform/node_modules','node_modules']) {
  const item = path.resolve(root,relative);
  if (!item.startsWith(root+path.sep)) throw Error('Outside deliverable');
  if (fs.existsSync(item)) {
    if (!fs.lstatSync(item).isSymbolicLink()) throw Error('Expected a junction');
    fs.rmdirSync(item); // Remove only the junction, never the target directory.
  }
}
for (const relative of ['outputs/study-platform','outputs']) {
  const item = path.resolve(root,relative);
  if (fs.existsSync(item) && fs.readdirSync(item).length === 0) fs.rmdirSync(item);
}
console.log('Removed temporary dependency junctions.');
