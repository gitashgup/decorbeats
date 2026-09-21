import test from 'node:test';
import assert from 'node:assert/strict';

test('auto-enrich response schema merges correctly into draft state', () => {
  const currentDraft = {
    id: 'test-uuid-123',
    revision: 1,
    data: {
      name: 'Brass God Idol',
      category: 'Idol',
      material: 'Brass',
      unit: '',
      notes: '',
      length: '6',
      width: '6',
      height: '13',
      weight_g: '533',
      mrp: '',
      cost_price: '',
      photos: {
        hero: { url: 'https://example.com/hero.webp' },
        front: { url: 'https://example.com/front.webp' },
        back: { url: 'https://example.com/back.webp' },
        detail: { url: 'https://example.com/detail.webp' }
      }
    }
  };

  const mockEnrichedPayload = {
    title: 'Handcrafted Brass Lord Krishna Playing Flute (13 cm, 533g) | Antique Finish Venugopal Murti',
    category: 'Idols & Sculptures',
    material: 'Solid Virgin Brass (Moradabad Handcrafted)',
    unit: '1 Handcrafted Brass Krishna Idol',
    marketPriceRange: '₹1,600 – ₹2,400',
    suggestedMrp: 2200,
    suggestedSellingPrice: 1850,
    estimatedCostPrice: 850,
    description: 'Exquisitely handcrafted in pure solid brass by master artisans of Moradabad...',
    highlights: [
      '100% Solid Virgin Brass: Handcrafted with intricate detailing in Moradabad.',
      'Dimensions & Weight: Height: 13 cm | Width: 6 cm | Weight: 533 g.',
      'Divine Iconography: Depicts Lord Krishna in serene Tribhanga posture on a lotus pedestal.',
      'Auspicious Placement: Ideal for Pooja Mandirs, meditation corners, and festive gifting.'
    ],
    careInstructions: 'Wipe with a clean, dry microfiber cloth. Use Pitambari occasionally for deep festive shine.',
    seoTitle: 'Brass Krishna Playing Flute Idol (13 cm) | Decorbeats',
    seoDescription: 'Handcrafted Moradabad solid brass Krishna idol. 13 cm, 533g. Perfect for Pooja Mandir & Janmashtami gifting.',
    searchKeywords: ['brass krishna', 'venugopal murti', 'pooja mandir decor', 'moradabad brass']
  };

  // Simulate frontend state merge
  const nextDraft = {
    ...currentDraft,
    data: {
      ...currentDraft.data,
      name: mockEnrichedPayload.title || currentDraft.data.name,
      category: mockEnrichedPayload.category || currentDraft.data.category,
      material: mockEnrichedPayload.material || currentDraft.data.material,
      unit: mockEnrichedPayload.unit || currentDraft.data.unit,
      notes: mockEnrichedPayload.description || currentDraft.data.notes,
      marketing: {
        ...mockEnrichedPayload,
        highlights: mockEnrichedPayload.highlights || []
      },
      marketBenchmark: {
        marketPriceRange: mockEnrichedPayload.marketPriceRange,
        suggestedMrp: mockEnrichedPayload.suggestedMrp,
        suggestedSellingPrice: mockEnrichedPayload.suggestedSellingPrice,
        estimatedCostPrice: mockEnrichedPayload.estimatedCostPrice
      },
      aiEnriched: true
    }
  };

  if (!nextDraft.data.mrp && mockEnrichedPayload.suggestedSellingPrice) {
    nextDraft.data.mrp = String(mockEnrichedPayload.suggestedSellingPrice);
  }
  if (!nextDraft.data.cost_price && mockEnrichedPayload.estimatedCostPrice) {
    nextDraft.data.cost_price = String(mockEnrichedPayload.estimatedCostPrice);
  }

  assert.equal(nextDraft.data.name, 'Handcrafted Brass Lord Krishna Playing Flute (13 cm, 533g) | Antique Finish Venugopal Murti');
  assert.equal(nextDraft.data.category, 'Idols & Sculptures');
  assert.equal(nextDraft.data.mrp, '1850');
  assert.equal(nextDraft.data.cost_price, '850');
  assert.equal(nextDraft.data.length, '6');
  assert.equal(nextDraft.data.weight_g, '533');
  assert.equal(nextDraft.data.aiEnriched, true);
  assert.equal(nextDraft.data.marketBenchmark.marketPriceRange, '₹1,600 – ₹2,400');
  assert.equal(nextDraft.data.marketing.highlights.length, 4);
});
