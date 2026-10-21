import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('The Brass Book encyclopedia data and component files exist', () => {
  const dataFile = new URL('../src/brass-book/brassBookData.js', import.meta.url);
  const componentFile = new URL('../src/brass-book/TheBrassBook.jsx', import.meta.url);
  const cssFile = new URL('../src/brass-book/brassBook.css', import.meta.url);

  assert.ok(existsSync(dataFile), 'Missing brassBookData.js');
  assert.ok(existsSync(componentFile), 'Missing TheBrassBook.jsx');
  assert.ok(existsSync(cssFile), 'Missing brassBook.css');
});

test('The Brass Book data contains all 7 craft stages, metallurgy presets, and authenticity tests', async () => {
  const {
    BRASS_STATS,
    ALLOY_PRESETS,
    METAL_COMPARISONS,
    SEVEN_CRAFT_STEPS,
    VASTU_SACRED_GUIDE,
    AUTHENTICITY_TESTS,
    CARE_METHODS,
    GLOSSARY_TERMS
  } = await import('../src/brass-book/brassBookData.js');

  assert.equal(BRASS_STATS.length, 4, 'Expected 4 high-level brass stats');
  assert.ok(ALLOY_PRESETS.length >= 3, 'Expected at least 3 alloy presets');
  assert.equal(METAL_COMPARISONS.length, 4, 'Expected 4 metals in comparison matrix');
  assert.equal(SEVEN_CRAFT_STEPS.length, 7, 'Expected exactly 7 sacred craft stages');
  assert.equal(VASTU_SACRED_GUIDE.length, 3, 'Expected 3 Vastu and sacred energy guides');
  assert.equal(AUTHENTICITY_TESTS.length, 4, 'Expected 4 authenticity inspection tests');
  assert.equal(CARE_METHODS.length, 4, 'Expected 4 care and restoration protocols');
  assert.ok(GLOSSARY_TERMS.length >= 15, 'Expected comprehensive glossary lexicon terms');

  // Verify lost-wax and sand casting references and image assets
  const stepTitles = SEVEN_CRAFT_STEPS.map((s) => s.title).join(' ');
  assert.ok(stepTitles.includes('Reti & Bhatti'), 'Missing Sand/Clay core step');
  assert.ok(stepTitles.includes('Madhuchishtavidhana'), 'Missing Lost-Wax step');
  assert.ok(stepTitles.includes('Naqqashi'), 'Missing Naqqashi engraving step');

  // Verify each craft stage has a dedicated photograph and Google Flow prompt
  for (const step of SEVEN_CRAFT_STEPS) {
    assert.ok(step.image, `Step ${step.step} missing image path`);
    const imgPath = new URL(`../public${step.image}`, import.meta.url);
    assert.ok(existsSync(imgPath), `Step ${step.step} image file does not exist: ${step.image}`);
    assert.ok(step.flowPrompt?.prompt, `Step ${step.step} missing Google Flow prompt`);
    assert.ok(step.flowPrompt?.cameraMotion, `Step ${step.step} missing Google Flow camera motion`);
  }

  // Verify authenticity test items
  const testIds = AUTHENTICITY_TESTS.map((t) => t.id);
  assert.ok(testIds.includes('magnet'), 'Missing magnet test');
  assert.ok(testIds.includes('sound'), 'Missing acoustic sound test');
  assert.ok(testIds.includes('weight'), 'Missing weight/density test');
  assert.ok(testIds.includes('scratch'), 'Missing scratch color test');
});

test('main.jsx routes /brass-book and /the-brass-book to TheBrassBook component', () => {
  const mainCode = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assert.ok(mainCode.includes('isBrassBookRoute'), 'Missing isBrassBookRoute function in main.jsx');
  assert.ok(mainCode.includes('/brass-book'), 'Missing /brass-book route path');
  assert.ok(mainCode.includes('/the-brass-book'), 'Missing /the-brass-book route path');
  assert.ok(mainCode.includes('<TheBrassBook'), 'Missing <TheBrassBook render in main.jsx');
});

test('App.jsx storefront integrates The Brass Book in Header, Home Banner, and Footer', () => {
  const appCode = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  // Header integration
  assert.ok(appCode.includes('customer-header-brass-book'), 'CustomerHeader missing brass book tab button');
  assert.ok(appCode.includes('/brass-book'), 'CustomerHeader missing /brass-book navigation target');

  // Discovery Banner on Storefront
  assert.ok(appCode.includes('function CustomerBrassBookBanner'), 'Missing CustomerBrassBookBanner definition');
  assert.ok(appCode.includes('<CustomerBrassBookBanner'), 'CustomerBrassBookBanner not rendered in customer-main');

  // Footer Link
  assert.ok(appCode.includes('customer-brass-book-footer-link'), 'CustomerFooter missing brass book link');
});

test('TheBrassBook.jsx supports crucible strike sound, horizontal option rail, and Flow prompt drawer', () => {
  const componentCode = readFileSync(new URL('../src/brass-book/TheBrassBook.jsx', import.meta.url), 'utf8');

  // Crucible strike sound & feedback
  assert.ok(componentCode.includes('handleCrucibleStrike'), 'Missing handleCrucibleStrike function');
  assert.ok(componentCode.includes('isSphereStriking'), 'Missing isSphereStriking state');
  assert.ok(componentCode.includes('bb-strike-shockwave'), 'Missing bb-strike-shockwave element');

  // Horizontal scroll to view options rail
  assert.ok(componentCode.includes('bb-alloy-scroll-rail'), 'Missing bb-alloy-scroll-rail element');
  assert.ok(componentCode.includes('bb-alloy-card-pill'), 'Missing bb-alloy-card-pill elements');

  // 7 Craft steps visual and Flow spec
  assert.ok(componentCode.includes('activeStep.image'), 'Showcase not using activeStep.image');
  assert.ok(componentCode.includes('bb-flow-spec-overlay'), 'Missing bb-flow-spec-overlay element');
  assert.ok(componentCode.includes('handleCopyFlowPrompt'), 'Missing handleCopyFlowPrompt function');
  assert.ok(componentCode.includes('bb-step-mobile-nav'), 'Missing mobile step navigation buttons');
});
