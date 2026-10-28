const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert');
const Module = require('module');
const origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'obsidian') return { Plugin: class {}, PluginSettingTab: class {}, Setting: class {}, Notice: class {} };
  return origLoad.apply(this, arguments);
};
const { preprocessMarkdown } = require('./main.js');
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

// Test <u>...</u> underline conversion and YAML metadata extraction
const underlineInput = `---\nfilename: My Custom Cheatsheet\ndate: 2026-10-28\ntemplate: cheatsheet\n---\nHere is <u>underlined text</u> and <u>second</u>.`;
const processedUnderline = preprocessMarkdown(underlineInput);
assert(processedUnderline.includes('[underlined text]{.underline}'), 'Should convert <u>...</u> to pandoc underline span');
assert(processedUnderline.includes('[second]{.underline}'), 'Should convert multiple <u>...</u> tags');
assert(processedUnderline.includes('title: My Custom Cheatsheet'), 'Should map filename/file_name in YAML to title if title is missing');


// Test note with dividers and bold/italic that previously crashed Pandoc with YAML alias error
const problematicNote = `
---
**Note:** Some summary
---
* Bullet 1
* Bullet 2
`;
const processedProblemNote = preprocessMarkdown(problematicNote);
assert(!processedProblemNote.includes('---'), 'Body dividers should be converted to ***');
assert(processedProblemNote.includes('***'), 'Should contain *** dividers');
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

// 3. End-to-end test using Pandoc if installed
const pandocBin = '/usr/local/bin/pandoc';
if (fs.existsSync(pandocBin)) {
  console.log('Testing End-to-End Pandoc + Typst pipeline with tricky dividers and lists...');
  const trickyInput = `
# Edge Case Document
---
**Note:** A summary that used to fail with alias error.
---
* Bullet point 1
* Bullet point 2 with *italic* and **bold**

| Target AWS Service    | Route Taken                    | Goes through NAT? | Why?                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RDS PostgreSQL 16** | **Direct Private VPC Routing** | ❌ **No**          | RDS is deployed directly inside the VPC **private subnets** (\`terraform-aws-eks/main.tf:L197-L204\`). Pods communicate over internal IP on port 5432 directly.                                                                                                             |
| **Amazon S3**         | **S3 VPC Gateway Endpoint**    | ❌ **No**          | Configured via \`aws_vpc_endpoint.s3\` (\`terraform-aws-eks/main.tf:L186-L195\`). AWS route tables route S3 prefix traffic across the internal AWS private network for free, completely bypassing the NAT Gateway.                                                            |

Check [[Internal Note]] and ![[image.png|300]].
`;
  const preprocessed = preprocessMarkdown(trickyInput);
  const tempInput = path.join(__dirname, 'test_e2e_input.md');
  const tempOutput = path.join(__dirname, 'test_e2e_output.pdf');
  const templatePath = path.join(__dirname, 'template.typ');

  fs.writeFileSync(tempInput, preprocessed, 'utf8');
  try {
    execFileSync(pandocBin, [
      tempInput,
      '-o', tempOutput,
      '--pdf-engine=/usr/local/bin/typst',
      `--template=${templatePath}`,
      '--table-of-contents',
      '-V', 'title=Edge Case Document',
      '-V', 'date=2026-10-21 17:40:00'
    ]);
    assert(fs.existsSync(tempOutput), 'E2E PDF should exist');
    const e2eStats = fs.statSync(tempOutput);
    assert(e2eStats.size > 1000, 'E2E PDF size should be > 1KB');
    console.log(`✓ End-to-end Pandoc + Typst 2-column compile passed! Size: ${e2eStats.size} bytes`);

    // Also test single-column template
    const templateSinglePath = path.join(__dirname, 'template-single.typ');
    const tempSingleOutput = path.join(__dirname, 'test_e2e_single.pdf');
    execFileSync(pandocBin, [
      tempInput,
      '-o', tempSingleOutput,
      '--pdf-engine=/usr/local/bin/typst',
      `--template=${templateSinglePath}`,
      '--table-of-contents',
      '-V', 'title=Edge Case Document',
      '-V', 'date=2026-10-21 17:40:00'
    ]);
    assert(fs.existsSync(tempSingleOutput), 'Single column E2E PDF should exist');
    const singleStats = fs.statSync(tempSingleOutput);
    assert(singleStats.size > 1000, 'Single column PDF size should be > 1KB');
    console.log(`✓ End-to-end Pandoc + Typst single-column compile passed! Size: ${singleStats.size} bytes`);
    if (fs.existsSync(tempSingleOutput)) fs.unlinkSync(tempSingleOutput);

    // Also test 5-column cheatsheet template
    const templateCheatsheetPath = path.join(__dirname, 'template-cheatsheet.typ');
    const tempCheatsheetOutput = path.join(__dirname, 'test_e2e_cheatsheet.pdf');
    const cheatsheetMd = preprocessMarkdown(`---
filename: Distributed Systems Cheatsheet
date: 2026-10-28
---
# Section 1: Consensus
Here is <u>underlined text</u> and **bold text**.
* Bullet 1
  * Nested bullet 1.1
* Bullet 2

## Raft Protocol
Leader election and log replication.
### Safety Properties
State machine safety.

---
# Section 2: Storage
New section color triggered by divider.
## B-Trees vs LSM
Write amplification vs read amplification.
`);
    const tempCheatsheetInput = path.join(__dirname, 'test_e2e_cheatsheet.md');
    fs.writeFileSync(tempCheatsheetInput, cheatsheetMd, 'utf8');
    execFileSync(pandocBin, [
      tempCheatsheetInput,
      '-o', tempCheatsheetOutput,
      '--pdf-engine=/usr/local/bin/typst',
      `--template=${templateCheatsheetPath}`
    ]);
    assert(fs.existsSync(tempCheatsheetOutput), 'Cheatsheet E2E PDF should exist');
    const csStats = fs.statSync(tempCheatsheetOutput);
    assert(csStats.size > 1000, 'Cheatsheet PDF size should be > 1KB');
    console.log(`✓ End-to-end Pandoc + Typst 5-column cheatsheet compile passed! Size: ${csStats.size} bytes`);
    if (fs.existsSync(tempCheatsheetInput)) fs.unlinkSync(tempCheatsheetInput);
    if (fs.existsSync(tempCheatsheetOutput)) fs.unlinkSync(tempCheatsheetOutput);
  } finally {
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
  }
}

console.log('All checks passed successfully!');
