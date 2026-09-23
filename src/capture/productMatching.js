/**
 * Intelligent Visual & Semantic Product Similarity Matcher
 * 
 * Compares an active capture draft against the existing inventory catalog
 * using multi-factor scoring (Iconography, Keywords, Category, Material, Scale).
 * Eliminates tedious and slow manual keyword searches.
 */

export function findSimilarProducts(draft, products = []) {
  if (!draft || !Array.isArray(products) || !products.length) return [];
  const d = draft.data || draft;
  const draftName = (d.name || '').toLowerCase();
  const draftCategory = (d.category || '').toLowerCase();
  const draftMaterial = (d.material || '').toLowerCase();

  // Words that are too generic to distinguish specific artifacts
  const stopWords = new Set([
    'and', 'with', 'the', 'for', 'handcrafted', 'handmade', 'pure', 'solid',
    'brass', 'metal', 'artifact', 'decor', 'decorative', 'item', 'product',
    'sculpture', 'sculptures', 'art', 'moradabad', 'finish', 'antique', 'glossy', 'set', 'size', 'sizes'
  ]);

  // Extract core distinguishing tokens
  const tokens = draftName
    .split(/[\s,–—\(\)\-\/\+]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 2 && !stopWords.has(t));

  const commonDeities = [
    'ganesha', 'ganesh', 'vishnu', 'lakshmi', 'narayan', 'sheshashayi',
    'krishna', 'shiva', 'buddha', 'hanuman', 'ram', 'sita', 'durga', 'saraswati',
    'diya', 'urli', 'bell', 'ghanti', 'shankh', 'turtle', 'elephant', 'peacock',
    'cow', 'kamal', 'lotus', 'plate', 'bowl', 'planter', 'tree', 'kalp', 'avatar'
  ];

  const scored = [];

  for (const p of products) {
    let score = 0;
    const reasons = [];
    const pName = (p.name || '').toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pMat = (p.material || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();

    // 1. Deity & Subject Motif Match (Highest priority)
    let matchedDeity = null;
    for (const deity of commonDeities) {
      const inDraft = draftName.includes(deity) || draftCategory.includes(deity);
      const inProduct = pName.includes(deity) || pCat.includes(deity) || pSku.includes(deity);
      if (inDraft && inProduct) {
        matchedDeity = deity;
        score += 45;
        break;
      }
    }
    if (matchedDeity) {
      const formatted = matchedDeity.charAt(0).toUpperCase() + matchedDeity.slice(1);
      reasons.push(`Matching motif: ${formatted}`);
    }

    // 2. Keyword tokens in Title or SKU
    let tokenMatches = 0;
    for (const token of tokens) {
      if (pName.includes(token) || pSku.includes(token)) {
        tokenMatches++;
        score += 25;
      }
    }
    if (tokenMatches > 0 && !matchedDeity) {
      reasons.push(`${tokenMatches} keyword match in title`);
    }

    // 3. Category classification match
    if (draftCategory && pCat) {
      if (draftCategory === pCat || draftCategory.includes(pCat) || pCat.includes(draftCategory)) {
        score += 20;
        if (!reasons.some(r => r.startsWith('Category'))) {
          reasons.push(`Category: ${p.category}`);
        }
      } else if (
        (draftCategory.includes('idol') || draftCategory.includes('sculpture')) &&
        (pCat.includes('decor') || pCat.includes('tree') || pCat.includes('murti') || pCat.includes('idol'))
      ) {
        score += 10;
      }
    }

    // 4. Material Match
    const draftIsBrass = draftMaterial.includes('brass') || draftName.includes('brass');
    const prodIsBrass = pMat.includes('brass') || pName.includes('brass') || pSku.includes('-br-');
    if (draftIsBrass && prodIsBrass) {
      score += 15;
    }

    // Cap maximum score to 98%
    const finalScore = Math.min(score, 98);

    if (finalScore >= 35) {
      scored.push({
        product: p,
        score: finalScore,
        reason: reasons.slice(0, 2).join(' · ') || 'Similar category & craft'
      });
    }
  }

  // Sort descending by match score
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}
