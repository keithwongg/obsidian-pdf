const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert');

// 1. Test markdown preprocessing logic
function preprocessMarkdown(content, resolveVaultPath = (p) => `/mock/vault/${p}`) {
  // Convert Obsidian image embeds ![[image.ext|size]] or ![[image.ext]] -> ![alt](path)
  let processed = content.replace(/!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    const resolvedPath = resolveVaultPath(linkPath.trim());
    let altText = path.basename(linkPath.trim());
    if (alias && !/^\d+(x\d+)?$/.test(alias.trim())) {
      altText = alias.trim();
    }
    return `![${altText}](${resolvedPath})`;
  });

  // Convert Obsidian wikilinks [[link|alias]] -> alias or [[link]] -> link
  processed = processed.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    return alias ? alias.trim() : linkPath.trim();
  });

  return processed;
}

// Test assertions for preprocessing
console.log('Testing Markdown preprocessing...');
const sampleInput = `
# Title
Check this [[Internal Note]] and this [[Other Note|Custom Label]].
Here is an image: ![[screenshot.png]] and sized: ![[photo.jpg|300]].
`;

const expectedOutput = `
# Title
Check this Internal Note and this Custom Label.
Here is an image: ![screenshot.png](/mock/vault/screenshot.png) and sized: ![photo.jpg](/mock/vault/photo.jpg).
`;

assert.strictEqual(preprocessMarkdown(sampleInput).trim(), expectedOutput.trim());
console.log('✓ Markdown preprocessing assertions passed.');

// 2. Test Typst template compilation
console.log('Testing Typst template compilation...');
const templateContent = fs.readFileSync(path.join(__dirname, 'template.typ'), 'utf8');

// Simple mock Pandoc template evaluator for testing template.typ
let testTypst = templateContent;
const contextData = {
  papersize: 'a4',
  'margin-x': '1.2cm',
  'margin-top': '1.6cm',
  'margin-bottom': '1.6cm',
  date: '2026-10-21 14:30:00',
  lang: 'en',
  title: 'Comparative Study on Knowledge Synthesis',
  toc: true,
  'toc-depth': '3',
  body: `
= Introduction
This is the introduction. General body text is 10pt and text color is black.
*Here is bold text rendered in dirty yellow.*

== Background
A section under heading 2 (22pt in navy blue).

=== Methodology
Under heading 3 (20pt).

==== Experimental Setup
Under heading 4 (18pt).

#lorem(150)
`
};

// Iteratively resolve innermost $if(...)$...$endif$ blocks
const innerIfRegex = /\$if\(([a-zA-Z0-9_-]+)\)\$((?:(?!\$if\()[\s\S])*?)\$endif\$/;
while (innerIfRegex.test(testTypst)) {
  testTypst = testTypst.replace(innerIfRegex, (match, varName, inner) => {
    const hasElse = inner.includes('$else$');
    const [thenBranch, elseBranch] = hasElse ? inner.split('$else$') : [inner, ''];
    return contextData[varName] ? thenBranch : elseBranch;
  });
}

// Replace variable expansions $var$
for (const [key, val] of Object.entries(contextData)) {
  if (typeof val === 'string') {
    testTypst = testTypst.split(`$${key}$`).join(val);
  }
}
// Clean up any unexpanded variables
testTypst = testTypst.replace(/\$[a-zA-Z0-9_-]+\$/g, '');

const testTypstFile = path.join(__dirname, 'test_output.typ');
const testPdfFile = path.join(__dirname, 'test_output.pdf');

fs.writeFileSync(testTypstFile, testTypst, 'utf8');

try {
  const typstBin = '/usr/local/bin/typst';
  execFileSync(typstBin, ['compile', testTypstFile, testPdfFile]);
  assert(fs.existsSync(testPdfFile), 'PDF output should exist');
  const stats = fs.statSync(testPdfFile);
  assert(stats.size > 1000, 'PDF size should be greater than 1KB');
  console.log(`✓ Typst compilation successful! Output size: ${stats.size} bytes`);
} finally {
  if (fs.existsSync(testTypstFile)) fs.unlinkSync(testTypstFile);
  if (fs.existsSync(testPdfFile)) fs.unlinkSync(testPdfFile);
}

console.log('All checks passed successfully!');
