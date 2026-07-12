const fs = require('fs');
const path = require('path');
const srcDir = 'c:/Users/Minhaz/Downloads/Easy-Q-Software';
const destDir = 'f:/Edusy User flow/Edusy app';
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        ensureDirectoryExistence(dest);
        fs.copyFileSync(src, dest);
        console.log('Copied ' + src);
    } else {
        console.log('Not found ' + src);
    }
}
copyFile(path.join(srcDir, 'src/components/Layouts/ModalLayout.tsx'), path.join(destDir, 'src/components/Layouts/ModalLayout.tsx'));
copyFile(path.join(srcDir, 'src/components/shared/Editor.tsx'), path.join(destDir, 'src/components/shared/Editor.tsx'));
console.log('Finished copying missing dependencies.');
