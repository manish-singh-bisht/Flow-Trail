import { useState } from 'react';
import { createFlow } from '@flow-trail/sdk';
import './App.css';
import { mockCandidates, referenceProduct, type Product } from './mock-data';

interface FilterResult {
  asin: string;
  title: string;
  metrics: { price: number; rating: number; reviews: number };
  filter_results: {
    price_range: { passed: boolean; detail: string };
    min_rating: { passed: boolean; detail: string };
    min_reviews: { passed: boolean; detail: string };
  };
  qualified: boolean;
}

interface RankedCandidate {
  rank: number;
  asin: string;
  title: string;
  metrics: { price: number; rating: number; reviews: number };
  score_breakdown: {
    review_count_score: number;
    rating_score: number;
    price_proximity_score: number;
  };
  total_score: number;
}

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Product | null>(null);

  const simulateDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runCompetitorSelection = async () => {
    setIsRunning(true);
    setStatus('Starting competitor selection process...');
    setSuccess(false);
    setSelectedCompetitor(null);

    try {
      // SDK: create a flow
      const flow = createFlow('competitor_product_selection');

      // Step 1: Keyword Generation
      setStatus('Step 1: Generating search keywords...');
      await simulateDelay(800);

      // SDK: create a step
      const step1 = flow.createStep('keyword_generation');
      const keywords = ['stainless steel water bottle insulated', 'vacuum insulated bottle 32oz'];

      // SDK: capture an observation
      step1.capture({
        name: 'input',
        data: {
          product_title: referenceProduct.title,
          category: referenceProduct.category,
        },
      });

      // SDK: capture an observation
      step1.capture({
        name: 'output',
        data: {
          keywords,
          model: 'gpt-4',
        },
      });

      // SDK: finish a step
      const step1Reason = `Generated ${keywords.length} optimized search keywords ("${keywords[0]}" and "${keywords[1]}") using GPT-4 based on product title "${referenceProduct.title}" and category "${referenceProduct.category}" to maximize search coverage`;
      step1.finish({ status: 'completed', reason: step1Reason });

      // SDK: create a step
      // Step 2: Candidate Search
      setStatus('Step 2: Searching for candidate products...');
      await simulateDelay(1000);
      const step2 = flow.createStep('candidate_search');
      const searchResults = mockCandidates.slice(0, 8);

      // SDK: capture an observation
      step2.capture({
        name: 'input',
        data: {
          keyword: keywords[0],
          limit: 50,
        },
      });

      // SDK: capture an observation
      step2.capture({
        name: 'output',
        data: {
          total_results: 2847,
          candidates_fetched: searchResults.length,
          candidates: searchResults,
        },
      });

      // SDK: finish a step
      const step2Reason = `Successfully retrieved ${searchResults.length} candidate products from a total pool of 2,847 results using keyword "${keywords[0]}". Products fetched represent top matches from the search index`;
      step2.finish({
        status: 'completed',
        reason: step2Reason,
      });

      // Step 3: Apply Filters
      setStatus('Step 3: Applying filters...');
      await simulateDelay(1200);

      // SDK: create a step
      const step3 = flow.createStep('apply_filters');
      const priceMin = referenceProduct.price * 0.5;
      const priceMax = referenceProduct.price * 2;
      const minRating = 3.8;
      const minReviews = 100;

      // SDK: capture an observation
      const filterResults: FilterResult[] = searchResults.map((candidate) => {
        const pricePassed = candidate.price >= priceMin && candidate.price <= priceMax;
        const ratingPassed = candidate.rating >= minRating;
        const reviewsPassed = candidate.reviews >= minReviews;
        const qualified = pricePassed && ratingPassed && reviewsPassed;

        return {
          asin: candidate.asin,
          title: candidate.title,
          metrics: {
            price: candidate.price,
            rating: candidate.rating,
            reviews: candidate.reviews,
          },
          filter_results: {
            price_range: {
              passed: pricePassed,
              detail: pricePassed
                ? `$${candidate.price.toFixed(2)} is within $${priceMin.toFixed(2)}-$${priceMax.toFixed(2)}`
                : `$${candidate.price.toFixed(2)} is ${candidate.price < priceMin ? 'below' : 'above'} range`,
            },
            min_rating: {
              passed: ratingPassed,
              detail: ratingPassed
                ? `${candidate.rating} >= ${minRating}`
                : `${candidate.rating} < ${minRating} threshold`,
            },
            min_reviews: {
              passed: reviewsPassed,
              detail: reviewsPassed
                ? `${candidate.reviews} >= ${minReviews}`
                : `${candidate.reviews} < ${minReviews} minimum`,
            },
          },
          qualified,
        };
      });

      // SDK: capture an observation
      step3.capture({
        name: 'input',
        data: {
          candidates_count: searchResults.length,
          reference_product: referenceProduct,
        },
      });

      // SDK: capture an observation
      step3.capture({
        name: 'filters_applied',
        data: {
          price_range: { min: priceMin, max: priceMax, rule: '0.5x - 2x of reference price' },
          min_rating: { value: minRating, rule: 'Must be at least 3.8 stars' },
          min_reviews: { value: minReviews, rule: 'Must have at least 100 reviews' },
        },
      });

      // SDK: capture an observation
      step3.capture({
        name: 'evaluations',
        data: filterResults,
        queryable: {
          'metrics.price': 'number',
          'metrics.rating': 'number',
          'metrics.reviews': 'number',
          'filter_results.price_range.passed': 'boolean',
          'filter_results.min_rating.passed': 'boolean',
          'filter_results.min_reviews.passed': 'boolean',
          qualified: 'boolean',
        },
      });

      const qualifiedCandidates = filterResults.filter((r) => r.qualified);

      // SDK: capture an observation
      step3.capture({
        name: 'output',
        data: {
          total_evaluated: filterResults.length,
          passed: qualifiedCandidates.length,
          failed: filterResults.length - qualifiedCandidates.length,
        },
      });

      // SDK: finish a step
      const step3Reason = `Applied 3-tier filtering criteria: price range ($${priceMin.toFixed(2)}-$${priceMax.toFixed(2)}), minimum rating (${minRating}★), and minimum reviews (${minReviews}+). Result: ${qualifiedCandidates.length} products passed all filters, ${filterResults.length - qualifiedCandidates.length} products eliminated for not meeting criteria`;
      step3.finish({
        status: 'completed',
        reason: step3Reason,
      });

      // Step 4: LLM Relevance Evaluation
      setStatus('Step 4: Evaluating relevance with LLM...');
      await simulateDelay(1000);
      const step4 = flow.createStep('llm_relevance_evaluation');
      // SDK: capture an observation
      const relevanceEvaluations = qualifiedCandidates.map((candidate) => {
        // Simulate LLM evaluation - exclude accessories
        const isAccessory =
          candidate.title.toLowerCase().includes('brush') ||
          candidate.title.toLowerCase().includes('replacement') ||
          candidate.title.toLowerCase().includes('carrier') ||
          candidate.title.toLowerCase().includes('bag');
        return {
          asin: candidate.asin,
          title: candidate.title,
          is_competitor: !isAccessory,
          confidence: isAccessory ? 0.98 : 0.92 + Math.random() * 0.06,
        };
      });

      // SDK: capture an observation
      step4.capture({
        name: 'input',
        data: {
          candidates_count: qualifiedCandidates.length,
          reference_product: {
            asin: referenceProduct.asin,
            title: referenceProduct.title,
            category: referenceProduct.category,
          },
          model: 'gpt-4',
        },
      });

      // SDK: capture an observation
      step4.capture({
        name: 'prompt_template',
        data: {
          template:
            "Given the reference product '{title}', determine if each candidate is a true competitor (same product type) or a false positive (accessory, replacement part, bundle, etc.)",
        },
      });

      // SDK: capture an observation
      step4.capture({
        name: 'evaluations',
        data: relevanceEvaluations,
      });

      const confirmedCompetitors = relevanceEvaluations.filter((e) => e.is_competitor);

      // SDK: capture an observation
      step4.capture({
        name: 'output',
        data: {
          total_evaluated: relevanceEvaluations.length,
          confirmed_competitors: confirmedCompetitors.length,
          false_positives_removed: relevanceEvaluations.length - confirmedCompetitors.length,
        },
      });

      // SDK: finish a step
      const falsePositivesRemoved = relevanceEvaluations.length - confirmedCompetitors.length;
      const step4Reason = `LLM evaluation using GPT-4 identified ${confirmedCompetitors.length} true competitors and removed ${falsePositivesRemoved} false positive${falsePositivesRemoved !== 1 ? 's' : ''} (accessories, replacement parts, bundles) that passed initial filters but are not direct product competitors`;
      step4.finish({
        status: 'completed',
        reason: step4Reason,
      });

      // Step 5: Rank & Select
      setStatus('Step 5: Ranking and selecting best competitor...');
      await simulateDelay(800);

      // SDK: create a step
      const step5 = flow.createStep('rank_and_select');

      const rankedCandidates: RankedCandidate[] = confirmedCompetitors
        .map((evaluation) => {
          const candidate = searchResults.find((c) => c.asin === evaluation.asin)!;
          const maxReviews = Math.max(
            ...confirmedCompetitors.map((e) => {
              const c = searchResults.find((c) => c.asin === e.asin)!;
              return c.reviews;
            })
          );
          const maxRating = Math.max(
            ...confirmedCompetitors.map((e) => {
              const c = searchResults.find((c) => c.asin === e.asin)!;
              return c.rating;
            })
          );

          const reviewCountScore = candidate.reviews / maxReviews;
          const ratingScore = candidate.rating / maxRating;
          const priceDiff = Math.abs(candidate.price - referenceProduct.price);
          const maxPriceDiff = Math.max(
            ...confirmedCompetitors.map((e) => {
              const c = searchResults.find((c) => c.asin === e.asin)!;
              return Math.abs(c.price - referenceProduct.price);
            })
          );
          const priceProximityScore = 1 - priceDiff / (maxPriceDiff || 1);

          const totalScore = reviewCountScore * 0.5 + ratingScore * 0.3 + priceProximityScore * 0.2;

          return {
            rank: 0, // Will be set after sorting
            asin: candidate.asin,
            title: candidate.title,
            metrics: {
              price: candidate.price,
              rating: candidate.rating,
              reviews: candidate.reviews,
            },
            score_breakdown: {
              review_count_score: reviewCountScore,
              rating_score: ratingScore,
              price_proximity_score: priceProximityScore,
            },
            total_score: totalScore,
          };
        })
        .sort((a, b) => b.total_score - a.total_score)
        .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

      const selected = rankedCandidates[0];
      const selectedProduct = searchResults.find((c) => c.asin === selected.asin)!;

      // SDK: capture an observation
      step5.capture({
        name: 'input',
        data: {
          candidates_count: confirmedCompetitors.length,
          reference_product: referenceProduct,
        },
      });

      // SDK: capture an observation
      step5.capture({
        name: 'ranking_criteria',
        data: {
          primary: 'review_count',
          secondary: 'rating',
          tertiary: 'price_proximity',
        },
      });

      // SDK: capture an observation
      step5.capture({
        name: 'ranked_candidates',
        data: rankedCandidates,
      });

      // SDK: capture an observation
      step5.capture({
        name: 'selection',
        data: {
          asin: selected.asin,
          title: selected.title,
          reason: `Highest overall score (${selected.total_score.toFixed(2)}) - top review count (${selected.metrics.reviews.toLocaleString()}) with strong rating (${selected.metrics.rating}★)`,
        },
      });
      step5.capture({
        name: 'output',
        data: {
          selected_competitor: selectedProduct,
        },
      });

      // SDK: finish a step
      const step5Reason = `Ranked ${confirmedCompetitors.length} candidates using weighted scoring (50% review count, 30% rating, 20% price proximity). Selected "${selectedProduct.title}" with total score ${selected.total_score.toFixed(3)} - leading with ${selected.metrics.reviews.toLocaleString()} reviews, ${selected.metrics.rating}★ rating, and price of $${selected.metrics.price.toFixed(2)}`;
      step5.finish({
        status: 'completed',
        reason: step5Reason,
      });

      setStatus('Finalizing and sending data...');
      await simulateDelay(500);
      // SDK: finish the flow
      await flow.finish();

      setSelectedCompetitor(selectedProduct);
      setSuccess(true);
      setStatus('Success! Competitor selected and data stored.');
    } catch (error) {
      console.error('Error in competitor selection:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSuccess(false);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🔍 Competitor Product Selection</h1>
          <p className="subtitle">X-Ray Demo - Multi-Step Decision Process</p>
        </header>

        <div className="reference-section">
          <h2>Reference Product</h2>
          <div className="product-card">
            <h3>{referenceProduct.title}</h3>
            <div className="product-details">
              <span>Price: ${referenceProduct.price.toFixed(2)}</span>
              <span>Rating: {referenceProduct.rating}★</span>
              <span>Reviews: {referenceProduct.reviews.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="action-section">
          <button className="run-button" onClick={runCompetitorSelection} disabled={isRunning}>
            {isRunning ? 'Processing...' : 'Find Best Competitor'}
          </button>

          {status && (
            <div className={`status ${success ? 'success' : isRunning ? 'running' : ''}`}>
              {status}
            </div>
          )}

          {success && selectedCompetitor && (
            <div className="success-section">
              <div className="success-badge">✓ Success</div>
              <div className="result-card">
                <h3>Selected Competitor</h3>
                <div className="product-card highlight">
                  <h3>{selectedCompetitor.title}</h3>
                  <div className="product-details">
                    <span>Price: ${selectedCompetitor.price.toFixed(2)}</span>
                    <span>Rating: {selectedCompetitor.rating}★</span>
                    <span>Reviews: {selectedCompetitor.reviews.toLocaleString()}</span>
                  </div>
                </div>
                <p className="result-message">
                  All process data has been captured and stored using the Flow Trail SDK. Check the
                  dashboard to view the complete decision trail!
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>Process Overview</h3>
          <ol className="steps-list">
            <li>Generate search keywords from product title/category</li>
            <li>Search and retrieve candidate products</li>
            <li>Apply filters (price range, rating, review count)</li>
            <li>Evaluate relevance with LLM (remove false positives)</li>
            <li>Rank candidates and select the best match</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
