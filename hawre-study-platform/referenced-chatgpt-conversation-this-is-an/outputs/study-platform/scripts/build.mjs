import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root,'package.json'));
// Resolve Vite's compiler dependency as a fallback for shared dependency runtimes.
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = createRequire(fs.realpathSync(require.resolve('vite/package.json')))('esbuild'); }
const postcss = require('postcss'), tailwind = require('tailwindcss'), autoprefixer = require('autoprefixer');
const out = path.join(root,'dist');
fs.mkdirSync(path.join(out,'assets'), { recursive:true });
const sourceFiles = [];
function collect(dir) { for (const entry of fs.readdirSync(dir,{withFileTypes:true})) { const full = path.join(dir,entry.name); if (entry.isDirectory()) collect(full); else if (/\.(jsx?|css)$/.test(entry.name)) sourceFiles.push(full); } }
collect(path.join(root,'src'));
function resolveFile(candidate) {
  for (const file of [candidate,...['.js','.jsx','.mjs','.json','/index.js','/index.jsx'].map(ext => candidate+ext)]) {
    try { if (fs.statSync(file).isFile()) return fs.realpathSync(file); } catch {}
  }
  throw Error(`Cannot resolve ${candidate}`);
}
const result = await esbuild.build({
  entryPoints:[path.join(root,'src/main.jsx')], bundle:true, write:false, format:'esm', platform:'browser', minify:true,
  jsx:'automatic', target:['es2022'], define:{'process.env.NODE_ENV':'"production"','import.meta.env.PROD':'true'},
  plugins:[{ name:'explicit-source-reader',setup(build) {
    build.onResolve({filter:/.*/}, args => {
      if (args.path.endsWith('.css')) return {path:args.path,namespace:'style-placeholder'};
      const basedir = args.importer ? path.dirname(args.importer) : root;
      const resolved = args.path.startsWith('.') || path.isAbsolute(args.path)
        ? resolveFile(path.resolve(basedir,args.path))
        : createRequire(path.join(basedir,'package.json')).resolve(args.path,{paths:[basedir,root]});
      return {path:fs.realpathSync(resolved),namespace:'source-file'};
    });
    build.onLoad({filter:/.*/,namespace:'style-placeholder'}, () => ({contents:'',loader:'js'}));
    build.onLoad({filter:/.*/,namespace:'source-file'}, args => ({contents:fs.readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.jsx')?'jsx':'js'}));
  }}]
});
fs.writeFileSync(path.join(out,'assets/app.js'),result.outputFiles[0].contents);
const content = sourceFiles.filter(f => /\.jsx?$/.test(f)).map(file => ({raw:fs.readFileSync(file,'utf8'),extension:'html'}));
const css = fs.readFileSync(path.join(root,'src/styles.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/print.css'),'utf8');
const styled = await postcss([tailwind({content,darkMode:'class',theme:{extend:{}},plugins:[]}),autoprefixer]).process(css,{from:path.join(root,'src/styles.css'),to:path.join(out,'assets/app.css')});
fs.writeFileSync(path.join(out,'assets/app.css'),styled.css);
const html = fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<script type="module" src="/src/main.jsx"></script>','<link rel="stylesheet" href="/assets/app.css"/><script type="module" src="/assets/app.js"></script>');
fs.writeFileSync(path.join(out,'index.html'),html);
for (const entry of fs.readdirSync(path.join(root,'public'))) fs.copyFileSync(path.join(root,'public',entry),path.join(out,entry));
console.log('Built study platform in dist/');
