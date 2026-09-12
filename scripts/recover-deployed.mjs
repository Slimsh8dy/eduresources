import fs from 'node:fs';
const js = JSON.parse(fs.readFileSync('static/js/main.495ac7e9.js.map', 'utf8'));
const css = JSON.parse(fs.readFileSync('static/css/main.4f713afc.css.map', 'utf8'));
fs.mkdirSync('app/src', { recursive: true });
for (const [map, name, output] of [[js, 'App.js', 'app/src/App.jsx'], [js, 'index.js', 'app/src/main.jsx'], [css, 'App.css', 'app/src/App.css'], [css, 'index.css', 'app/src/index.css']]) {
  const i = map.sources.findIndex(s => s === name || (s.endsWith('/'+name) && !s.includes('node_modules')));
  if (i >= 0) { fs.writeFileSync(output, map.sourcesContent[i]); console.log(output); }
}
