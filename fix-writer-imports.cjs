const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/PC/Desktop/SEOforge/packages/content-generation/src/writers';
fs.readdirSync(dir).forEach(f => {
  if (f.endsWith('.ts')) {
    const fp = path.join(dir, f);
    let c = fs.readFileSync(fp, 'utf8');
    c = c.replace(/import type \{ BrandProfile, ContentBrief \} from "\.\.\/\.\.\/\.\.\/core\/src\/index\.js";/g, 'import type { BrandProfile } from "@forge/core";\nimport type { ContentBrief } from "../brief/builder.js";');
    fs.writeFileSync(fp, c);
  }
});
