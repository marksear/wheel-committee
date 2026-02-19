import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ChevronRight, ChevronLeft,
  Check, Loader2, Target, BarChart2, ChevronDown, Activity,
  BarChart3, AlertTriangle, Eye, Calendar, BookOpen,
  Repeat, ArrowRight, ArrowDown, Star, Shield, Clock,
  PieChart, Wallet, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Award, Zap, Brain, Layers
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export default function WheelCommitteeApp() {
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [expandedTrade, setExpandedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('new');

  const [formData, setFormData] = useState({
    // Account
    accountSize: '50000',
    cashAvailable: '30000',
    buyingPower: '100000',
    mode: 'cash_secured',
    // Experience
    experienceLevel: 'intermediate',
    marginApproved: true,
    optionsLevel: '2',
    // Risk
    maxSinglePosition: '30',
    maxSectorExposure: '40',
    minWheelScore: '6',
    targetMonthlyIncome: '1000',
    // Positions
    currentPositions: '',
    // Watchlist
    watchlist: 'AAPL\nMSFT\nKO\nPEP\nJNJ',
    // Session
    sessionType: 'new_trades',
    targetDelta: '0.18',
    targetDte: '2',
    marketOutlook: 'neutral',
    // Strategy Mode
    strategyMode: 'wheel',
  });

  const steps = [
    { title: 'Welcome', icon: BookOpen },
    { title: 'Account', icon: Wallet },
    { title: 'Positions', icon: BarChart3 },
    { title: 'Watchlist', icon: Eye },
    { title: 'Settings', icon: Target },
    { title: 'Analysis', icon: Brain },
  ];

  // Build dynamic analysis steps based on watchlist
  const getAnalysisSteps = () => {
    const tickers = formData.watchlist
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t));

    if (formData.strategyMode === 'pmcc') {
      const steps = [
        'Loading account data...',
        'Checking available capital...',
      ];
      tickers.forEach(ticker => {
        steps.push(`Screening ${ticker} for LEAPS...`);
      });
      steps.push(
        'Identifying LEAPS candidates (Delta ≥0.80)...',
        'Checking DTE >365 days...',
        'Evaluating short call premiums...',
        'Comparing extrinsic values...',
        'Calculating max profit spreads...',
        'Estimating capital savings...',
        'Generating PMCC recommendations...'
      );
      return steps;
    }

    if (formData.strategyMode === 'spreads') {
      const steps = [
        'Loading account data...',
        'Checking buying power...',
      ];
      tickers.forEach(ticker => {
        steps.push(`Fetching ${ticker} options chain...`);
      });
      steps.push(
        'Screening Bull Put Spreads...',
        'Screening Bear Call Spreads...',
        'Building Iron Condors...',
        'Calculating Probability of Profit...',
        'Evaluating risk/reward ratios...',
        'Computing P&L profiles...',
        'Generating spread recommendations...'
      );
      return steps;
    }

    const steps = [
      'Loading account data...',
      'Checking buying power...',
      'Calculating current exposure...',
    ];

    // Add a step for each ticker in the watchlist
    tickers.forEach(ticker => {
      steps.push(`Analyzing ${ticker}...`);
    });

    // Add the final processing steps
    steps.push(
      'Computing Wheel Scores™...',
      'Checking earnings dates...',
      'Screening IV Rank...',
      'Selecting optimal strikes...',
      'Calculating premiums...',
      'Running Assignment Comfort Test...',
      'Ranking opportunities...',
      'Generating recommendations...'
    );

    return steps;
  };

  const analysisSteps = getAnalysisSteps();

  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setCurrentAnalysisStep(0);
    setAnalysisError(null);

    // Animate through steps while waiting for API
    // Adjust timing based on number of steps (aim for ~15-20 seconds total animation)
    const totalAnimationTime = 18000; // 18 seconds
    const stepInterval = Math.max(400, Math.min(1000, totalAnimationTime / analysisSteps.length));

    const interval = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= analysisSteps.length - 1) return prev;
        return prev + 1;
      });
    }, stepInterval);

    try {
      const apiEndpoint = formData.strategyMode === 'pmcc' ? '/api/pmcc' : formData.strategyMode === 'spreads' ? '/api/spreads' : '/api/analyze';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setCurrentAnalysisStep(analysisSteps.length - 1);

      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisComplete(true);
      }, 500);

    } catch (error) {
      clearInterval(interval);
      setAnalysisError(error.message);
      setIsAnalyzing(false);
    }
  };

  // Star rating component
  const StarRating = ({ rating, max = 5 }) => (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">The Wheel Committee</h1>
              <p className="text-gray-600 max-w-md mx-auto">
                Systematic premium collection via cash-secured puts and covered calls on quality stocks.
              </p>
            </div>

            {/* The Wheel Cycle Visual */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
              <h2 className="font-bold text-lg mb-4 text-center">The Wheel Strategy</h2>
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <span className="text-xs mt-2 text-gray-300">Cash</span>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-500" />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center">
                    <ArrowDown className="w-8 h-8" />
                  </div>
                  <span className="text-xs mt-2 text-gray-300">Sell Put</span>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-500" />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <span className="text-xs mt-2 text-gray-300">Own Shares</span>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-500" />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <span className="text-xs mt-2 text-gray-300">Sell Call</span>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-500" />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Repeat className="w-8 h-8" />
                  </div>
                  <span className="text-xs mt-2 text-gray-300">Repeat</span>
                </div>
              </div>

              <p className="text-center text-gray-400 text-sm mt-4">
                Collect premium at every step • Only wheel stocks you'd happily own
              </p>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Wheel Score™</p>
                <p className="text-xs text-gray-500">Rate stock suitability</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <PieChart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Income Dashboard</p>
                <p className="text-xs text-gray-500">Track your premiums</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Smart Strikes</p>
                <p className="text-xs text-gray-500">Delta-based selection</p>
              </div>
            </div>

            {/* US Only Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <span className="text-2xl">🇺🇸</span>
              <div>
                <p className="font-medium text-blue-900">US Markets Only</p>
                <p className="text-sm text-blue-700">This strategy uses US-listed options with deep liquidity.</p>
              </div>
            </div>

            {/* Risk Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>⚠️ Risk Warning:</strong> Options involve substantial risk. You can lose more than your initial investment. Minimum recommended account: <strong>$20,000</strong>. Not financial advice.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
            <p className="text-gray-600">Configure your account and risk parameters</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Size ($)</label>
                <input
                  type="number"
                  value={formData.accountSize}
                  onChange={(e) => setFormData({ ...formData, accountSize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cash Available ($)</label>
                <input
                  type="number"
                  value={formData.cashAvailable}
                  onChange={(e) => setFormData({ ...formData, cashAvailable: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position Sizing Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, mode: 'cash_secured' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.mode === 'cash_secured'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${formData.mode === 'cash_secured' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">Cash-Secured</span>
                  </div>
                  <p className="text-sm text-gray-600">Full cash coverage for assignment</p>
                  <p className="text-xs text-gray-400 mt-1">Recommended for most traders</p>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, mode: 'margin' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.mode === 'margin'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className={`w-5 h-5 ${formData.mode === 'margin' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">Margin</span>
                  </div>
                  <p className="text-sm text-gray-600">Use buying power for efficiency</p>
                  <p className="text-xs text-amber-600 mt-1">⚠️ Advanced — amplifies losses</p>
                </button>
              </div>
            </div>

            {formData.mode === 'margin' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buying Power ($)</label>
                <input
                  type="number"
                  value={formData.buyingPower}
                  onChange={(e) => setFormData({ ...formData, buyingPower: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 mb-2"
                />
                <p className="text-xs text-amber-700">We'll limit BPR to 50% max to maintain safety margin.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="beginner">Beginner (learning)</option>
                  <option value="intermediate">Intermediate (some experience)</option>
                  <option value="advanced">Advanced (experienced)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options Approval Level</label>
                <select
                  value={formData.optionsLevel}
                  onChange={(e) => setFormData({ ...formData, optionsLevel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="1">Level 1 (Covered calls only)</option>
                  <option value="2">Level 2 (Cash-secured puts)</option>
                  <option value="3">Level 3 (Spreads)</option>
                  <option value="4">Level 4 (Naked options)</option>
                </select>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                <strong>Capital Summary:</strong> With ${parseInt(formData.cashAvailable).toLocaleString()} cash, 
                you can wheel <strong>1-2 positions</strong> in the $100-150 range, or <strong>2-3 positions</strong> in the $50-80 range.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Current Positions</h2>
            <p className="text-gray-600">Enter your open Wheel positions (if any)</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Open Positions</label>
              <textarea
                value={formData.currentPositions}
                onChange={(e) => setFormData({ ...formData, currentPositions: e.target.value })}
                placeholder="Example:
PUT, AAPL, 180, 2026-02-21, 2.50, 2026-01-15
PUT, MSFT, 400, 2026-02-28, 4.20, 2026-01-18
CALL, KO, 62, 2026-02-21, 0.85, 2026-01-20
SHARES, PEP, 100, 168.50, -, 2026-01-10

Format: Type, Ticker, Strike/Shares, Expiry/CostBasis, Premium, Opened"
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Position Types</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span><strong>PUT</strong> — Open short put</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span><strong>CALL</strong> — Open covered call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span><strong>SHARES</strong> — Assigned shares</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>No positions yet?</strong> That's fine — leave this blank and we'll recommend new trades on stocks from your watchlist.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Watchlist</h2>
            <p className="text-gray-600">Enter tickers you want to analyze for The Wheel</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stocks to Analyze</label>
              <textarea
                value={formData.watchlist}
                onChange={(e) => setFormData({ ...formData, watchlist: e.target.value })}
                placeholder="Enter one ticker per line:
AAPL
MSFT
KO
PEP
JNJ"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="font-medium text-emerald-900 mb-2">What We'll Analyze</h3>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>✓ Wheel Score™ (liquidity, IV, quality, price, dividends)</li>
                <li>✓ Current IV Rank & premium levels</li>
                <li>✓ Earnings dates (avoid holding through earnings)</li>
                <li>✓ Optimal strike & expiry selection</li>
                <li>✓ Expected returns (monthly & annualized)</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">💡 Good Wheel Candidates</h3>
              <p className="text-sm text-gray-600 mb-2">Stocks that typically work well:</p>
              <div className="flex flex-wrap gap-2">
                {['AAPL', 'MSFT', 'KO', 'PEP', 'JNJ', 'PG', 'JPM', 'V', 'HD', 'MCD'].map(ticker => (
                  <button
                    key={ticker}
                    onClick={() => {
                      const current = formData.watchlist.split('\n').filter(t => t.trim());
                      if (!current.includes(ticker)) {
                        setFormData({ ...formData, watchlist: [...current, ticker].join('\n') });
                      }
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-sm hover:bg-gray-100 transition-colors"
                  >
                    + {ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Trade Settings</h2>
            <p className="text-gray-600">Configure your trade preferences</p>

            {/* Strategy Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Mode</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, strategyMode: 'wheel' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.strategyMode === 'wheel'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className={`w-5 h-5 ${formData.strategyMode === 'wheel' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">The Wheel</span>
                  </div>
                  <p className="text-sm text-gray-600">Cash-secured puts & covered calls</p>
                  <p className="text-xs text-gray-400 mt-1">Classic income strategy</p>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, strategyMode: 'pmcc' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.strategyMode === 'pmcc'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`w-5 h-5 ${formData.strategyMode === 'pmcc' ? 'text-teal-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">PMCC</span>
                  </div>
                  <p className="text-sm text-gray-600">Poor Man's Covered Call via LEAPS</p>
                  <p className="text-xs text-gray-400 mt-1">~70-80% less capital</p>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, strategyMode: 'spreads' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.strategyMode === 'spreads'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className={`w-5 h-5 ${formData.strategyMode === 'spreads' ? 'text-violet-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">Spreads</span>
                  </div>
                  <p className="text-sm text-gray-600">Verticals & Iron Condors</p>
                  <p className="text-xs text-gray-400 mt-1">Risk-defined income</p>
                </button>
              </div>
            </div>

            {formData.strategyMode === 'pmcc' && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <p className="text-sm text-teal-800">
                  <strong>PMCC Mode:</strong> We'll identify LEAPS calls (Delta ≥0.80, &gt;365 DTE) and pair them with short-term calls to generate income — using ~70-80% less capital than owning 100 shares.
                </p>
              </div>
            )}

            {formData.strategyMode === 'spreads' && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                <p className="text-sm text-violet-800">
                  <strong>Spreads Mode:</strong> We'll analyse Bull Put Spreads, Bear Call Spreads, and Iron Condors for each ticker — risk-defined strategies with known max profit and max loss.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Delta</label>
                <select
                  value={formData.targetDelta}
                  onChange={(e) => setFormData({ ...formData, targetDelta: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="0.12">0.10-0.15 (Very Conservative — 85-90% win)</option>
                  <option value="0.18">0.16-0.20 (Standard — 80-84% win)</option>
                  <option value="0.25">0.21-0.30 (Income Focused — 70-79% win)</option>
                  <option value="0.35">0.31-0.40 (Aggressive — 60-69% win)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target DTE (Days to Expiry)</label>
                <select
                  value={formData.targetDte}
                  onChange={(e) => setFormData({ ...formData, targetDte: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="14">7-14 days (Fast turnover)</option>
                  <option value="25">21-30 days (Monthly)</option>
                  <option value="35">30-45 days (Optimal theta)</option>
                  <option value="52">45-60 days (Patient)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Wheel Score™</label>
                <select
                  value={formData.minWheelScore}
                  onChange={(e) => setFormData({ ...formData, minWheelScore: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="5">5.0+ (Acceptable)</option>
                  <option value="6">6.0+ (Good)</option>
                  <option value="7">7.0+ (Very Good)</option>
                  <option value="8">8.0+ (Excellent only)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market Outlook</label>
                <select
                  value={formData.marketOutlook}
                  onChange={(e) => setFormData({ ...formData, marketOutlook: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="bullish">📈 Bullish (sell higher delta puts)</option>
                  <option value="neutral">➡️ Neutral (standard approach)</option>
                  <option value="bearish">📉 Bearish (lower delta, skip puts)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Single Position (%)</label>
                <input
                  type="number"
                  value={formData.maxSinglePosition}
                  onChange={(e) => setFormData({ ...formData, maxSinglePosition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Monthly Income ($)</label>
                <input
                  type="number"
                  value={formData.targetMonthlyIncome}
                  onChange={(e) => setFormData({ ...formData, targetMonthlyIncome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className={`${formData.strategyMode === 'pmcc' ? 'bg-teal-50 border-teal-200' : formData.strategyMode === 'spreads' ? 'bg-violet-50 border-violet-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-4`}>
              <p className={`text-sm ${formData.strategyMode === 'pmcc' ? 'text-teal-800' : formData.strategyMode === 'spreads' ? 'text-violet-800' : 'text-emerald-800'}`}>
                {formData.strategyMode === 'pmcc' ? (
                  <><strong>PMCC Summary:</strong> Scanning watchlist for LEAPS candidates (Delta ≥0.80, &gt;365 DTE) with profitable short call pairings. Goal: ${parseInt(formData.targetMonthlyIncome).toLocaleString()}/month income with reduced capital.</>
                ) : formData.strategyMode === 'spreads' ? (
                  <><strong>Spreads Summary:</strong> Scanning for Bull Put Spreads, Bear Call Spreads, and Iron Condors at ~{parseFloat(formData.targetDelta) * 100}% delta, {formData.targetDte} DTE. Goal: ${parseInt(formData.targetMonthlyIncome).toLocaleString()}/month in premium with defined risk.</>
                ) : (
                  <><strong>Settings Summary:</strong> Targeting ~{parseFloat(formData.targetDelta) * 100}% delta puts, {formData.targetDte} DTE, on stocks scoring {formData.minWheelScore}+. Goal: ${parseInt(formData.targetMonthlyIncome).toLocaleString()}/month in premium.</>
                )}
              </p>
            </div>
          </div>
        );

      case 5:
        if (isAnalyzing) {
          return (
            <div className="text-center py-8 space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                <RefreshCw className="absolute inset-0 m-auto w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.strategyMode === 'pmcc' ? 'PMCC Scanner Running' : formData.strategyMode === 'spreads' ? 'Spreads Scanner Running' : 'Wheel Committee in Session'}
              </h2>

              <div className="max-w-md mx-auto text-left bg-gray-50 rounded-xl p-4">
                <div className="space-y-2">
                  {analysisSteps.map((stepText, i) => (
                    <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      i < currentAnalysisStep ? 'text-green-600' :
                      i === currentAnalysisStep ? 'text-emerald-600 font-medium' :
                      'text-gray-300'
                    }`}>
                      {i < currentAnalysisStep ? (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      ) : i === currentAnalysisStep ? (
                        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (analysisError) {
          return (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Analysis Failed</h2>
              <p className="text-gray-600">{analysisError}</p>
              <button
                onClick={runAnalysis}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          );
        }

        if (analysisComplete && analysisResult) {
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-2xl p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-emerald-200 text-sm">Wheel Committee Report</p>
                    <h1 className="text-2xl font-bold mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
                    <p className="text-emerald-300 mt-2">
                      {formData.strategyMode === 'pmcc' ? 'PMCC Mode' : formData.strategyMode === 'spreads' ? 'Spreads Mode' : (analysisResult.mode || (formData.mode === 'cash_secured' ? 'Cash-Secured Mode' : 'Margin Mode'))} • {formData.watchlist.split('\n').filter(t => t.trim()).length} stocks analyzed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200 text-xs">Cash Available</p>
                    <p className="text-lg font-bold">${parseInt(formData.cashAvailable).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200 text-xs">Stocks Analyzed</p>
                    <p className="text-lg font-bold">{analysisResult.trades?.length || formData.watchlist.split('\n').filter(t => t.trim()).length}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200 text-xs">Target DTE</p>
                    <p className="text-lg font-bold">{formData.targetDte} days</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200 text-xs">Target Delta</p>
                    <p className="text-lg font-bold">{formData.targetDelta}</p>
                  </div>
                </div>
              </div>

              {/* PMCC Results Table */}
              {formData.strategyMode === 'pmcc' && analysisResult.pmccTrades && analysisResult.pmccTrades.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">PMCC Analysis — LEAPS + Short Call Pairings</h2>
                    <p className="text-sm text-gray-500 mt-1">Poor Man's Covered Call candidates ranked by capital efficiency</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Ticker</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">LEAPS Strike</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">DTE</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Delta</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Short Call</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Premium</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Extrinsic</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Max Profit</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Capital Req.</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Savings</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.pmccTrades.map((trade, index) => (
                          <tr
                            key={trade.ticker || index}
                            className={`border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                              expandedTrade === trade.ticker ? 'bg-teal-50' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setExpandedTrade(expandedTrade === trade.ticker ? null : trade.ticker)}
                          >
                            <td className="px-4 py-3 font-bold text-gray-900">{trade.ticker}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.leapsStrike != null ? `$${trade.leapsStrike}` : '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.leapsDTE ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.leapsDelta ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.shortCallStrike != null ? `$${trade.shortCallStrike}` : '—'}</td>
                            <td className="px-4 py-3 text-emerald-600 font-medium">{trade.shortCallPremium != null ? `$${trade.shortCallPremium}` : '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.extrinsicValue != null ? `$${trade.extrinsicValue}` : '—'}</td>
                            <td className="px-4 py-3 text-emerald-600 font-medium">{trade.maxProfit != null ? `$${trade.maxProfit}` : '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{trade.capitalRequired != null ? `$${trade.capitalRequired.toLocaleString()}` : '—'}</td>
                            <td className="px-4 py-3">
                              {trade.capitalSaved != null ? (
                                <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                                  {trade.capitalSaved}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {trade.verdict && (
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  trade.verdict === 'BUY' || trade.verdict === 'SELL' ? 'bg-green-100 text-green-700' :
                                  trade.verdict === 'WAIT' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{trade.verdict}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Expanded PMCC trade detail */}
                  {analysisResult.pmccTrades.map((trade) => (
                    expandedTrade === trade.ticker && (
                      <div key={`detail-${trade.ticker}`} className="px-4 pb-4 bg-teal-50 border-t border-teal-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                          {trade.capitalRequired != null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500">Capital Required</p>
                              <p className="font-bold text-gray-900">${trade.capitalRequired.toLocaleString()}</p>
                            </div>
                          )}
                          {trade.capitalSaved != null && (
                            <div className="bg-teal-100 rounded-lg p-3 border border-teal-200">
                              <p className="text-xs text-teal-600">Capital Saved vs Shares</p>
                              <p className="font-bold text-teal-700">{trade.capitalSaved}%</p>
                            </div>
                          )}
                          {trade.maxProfit != null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500">Max Profit</p>
                              <p className="font-bold text-emerald-600">${trade.maxProfit}</p>
                            </div>
                          )}
                          {trade.shortCallPremium != null && trade.extrinsicValue != null && (
                            <div className={`rounded-lg p-3 border ${
                              trade.shortCallPremium > trade.extrinsicValue
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <p className="text-xs text-gray-500">Premium vs Extrinsic</p>
                              <p className={`font-bold ${
                                trade.shortCallPremium > trade.extrinsicValue
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}>
                                ${trade.shortCallPremium} vs ${trade.extrinsicValue} {trade.shortCallPremium > trade.extrinsicValue ? '✓' : '✗'}
                              </p>
                            </div>
                          )}
                        </div>
                        {trade.rationale && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                            <p className="text-xs font-medium text-amber-800 mb-1">Rationale</p>
                            <p className="text-sm text-amber-700">{trade.rationale}</p>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* PMCC Summary */}
              {formData.strategyMode === 'pmcc' && analysisResult.pmccSummary && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">PMCC Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    {analysisResult.pmccSummary.totalCandidates != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{analysisResult.pmccSummary.totalCandidates}</p>
                        <p className="text-xs text-gray-500">PMCC Candidates</p>
                      </div>
                    )}
                    {analysisResult.pmccSummary.totalCapitalRequired != null && (
                      <div className="text-center p-3 bg-teal-50 rounded-lg">
                        <p className="text-2xl font-bold text-teal-600">${analysisResult.pmccSummary.totalCapitalRequired.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Capital Needed</p>
                      </div>
                    )}
                    {analysisResult.pmccSummary.avgCapitalSaved != null && (
                      <div className="text-center p-3 bg-teal-50 rounded-lg">
                        <p className="text-2xl font-bold text-teal-600">{analysisResult.pmccSummary.avgCapitalSaved}%</p>
                        <p className="text-xs text-gray-500">Avg Capital Saved</p>
                      </div>
                    )}
                    {analysisResult.pmccSummary.totalMaxProfit != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">${analysisResult.pmccSummary.totalMaxProfit.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Max Profit</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spreads Results */}
              {formData.strategyMode === 'spreads' && analysisResult.spreadTrades && analysisResult.spreadTrades.length > 0 && (
                <div className="space-y-4">
                  {/* Group trades by ticker */}
                  {(() => {
                    const byTicker = {};
                    analysisResult.spreadTrades.forEach(trade => {
                      if (!byTicker[trade.ticker]) byTicker[trade.ticker] = [];
                      byTicker[trade.ticker].push(trade);
                    });
                    return Object.entries(byTicker).map(([ticker, trades]) => (
                      <div key={ticker} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                          <h2 className="font-bold text-gray-900">{ticker} — Spread Strategies</h2>
                          <p className="text-sm text-gray-500 mt-1">{trades.length} strategies analyzed</p>
                        </div>

                        {trades.map((trade, idx) => (
                          <div key={`${trade.ticker}-${trade.strategy}-${idx}`} className="border-b border-gray-100 last:border-b-0">
                            <button
                              onClick={() => setExpandedTrade(expandedTrade === `${trade.ticker}-${trade.strategy}` ? null : `${trade.ticker}-${trade.strategy}`)}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  trade.strategy === 'Iron Condor' ? 'bg-purple-100' :
                                  trade.strategy === 'Bull Put Spread' ? 'bg-emerald-100' :
                                  'bg-rose-100'
                                }`}>
                                  <Layers className={`w-6 h-6 ${
                                    trade.strategy === 'Iron Condor' ? 'text-purple-600' :
                                    trade.strategy === 'Bull Put Spread' ? 'text-emerald-600' :
                                    'text-rose-600'
                                  }`} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-gray-900">{trade.strategy}</p>
                                  <p className="text-sm text-gray-500">
                                    {trade.strategy === 'Iron Condor'
                                      ? `${trade.shortStrike}/${trade.longStrike} put · ${trade.shortCallStrike}/${trade.longCallStrike} call`
                                      : `${trade.shortStrike}/${trade.longStrike} · $${trade.spreadWidth} wide`}
                                    {trade.dte ? ` · ${trade.dte} DTE` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  {trade.verdict && (
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      trade.verdict === 'SELL' ? 'bg-green-100 text-green-700' :
                                      trade.verdict === 'WAIT' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{trade.verdict}</span>
                                  )}
                                  {trade.premium != null && (
                                    <p className="text-sm mt-1 font-medium text-emerald-600">${trade.premium} credit</p>
                                  )}
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedTrade === `${trade.ticker}-${trade.strategy}` ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {expandedTrade === `${trade.ticker}-${trade.strategy}` && (
                              <div className="px-4 pb-4 bg-violet-50 border-t border-violet-200">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                                  {trade.maxProfit != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Max Profit</p>
                                      <p className="font-bold text-emerald-600">${trade.maxProfit}</p>
                                    </div>
                                  )}
                                  {trade.maxLoss != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Max Loss</p>
                                      <p className="font-bold text-red-600">-${trade.maxLoss}</p>
                                    </div>
                                  )}
                                  {trade.probabilityOfProfit != null && (
                                    <div className={`rounded-lg p-3 border ${trade.probabilityOfProfit >= 70 ? 'bg-emerald-50 border-emerald-200' : trade.probabilityOfProfit >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                      <p className="text-xs text-gray-500">Prob. of Profit</p>
                                      <p className={`font-bold ${trade.probabilityOfProfit >= 70 ? 'text-emerald-600' : trade.probabilityOfProfit >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{trade.probabilityOfProfit}%</p>
                                    </div>
                                  )}
                                  {trade.returnOnRisk != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Return on Risk</p>
                                      <p className="font-bold text-violet-600">{trade.returnOnRisk.toFixed(1)}%</p>
                                    </div>
                                  )}
                                  {trade.buyingPowerRequired != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Buying Power Req.</p>
                                      <p className="font-bold text-gray-900">${trade.buyingPowerRequired}</p>
                                    </div>
                                  )}
                                  {trade.breakeven != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">{trade.strategy === 'Iron Condor' ? 'Lower Breakeven' : 'Breakeven'}</p>
                                      <p className="font-bold text-gray-900">${trade.breakeven}</p>
                                    </div>
                                  )}
                                  {trade.upperBreakeven != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Upper Breakeven</p>
                                      <p className="font-bold text-gray-900">${trade.upperBreakeven}</p>
                                    </div>
                                  )}
                                  {trade.dte != null && (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-xs text-gray-500">Days to Expiry</p>
                                      <p className="font-bold text-gray-900">{trade.dte} DTE</p>
                                    </div>
                                  )}
                                </div>

                                {/* P&L Diagram */}
                                {trade.maxProfit != null && trade.maxLoss != null && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-3">
                                    <p className="text-xs font-medium text-gray-700 mb-3">P&L at Expiration</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                      <AreaChart
                                        data={(() => {
                                          // Build P&L curve data points
                                          const points = [];
                                          if (trade.strategy === 'Iron Condor') {
                                            const lp = trade.longStrike;
                                            const sp = trade.shortStrike;
                                            const sc = trade.shortCallStrike;
                                            const lc = trade.longCallStrike;
                                            const mp = trade.maxProfit;
                                            const ml = trade.maxLoss;
                                            const pad = (lc - lp) * 0.3;
                                            points.push({ price: lp - pad, pl: -ml });
                                            points.push({ price: lp, pl: -ml });
                                            points.push({ price: sp, pl: mp });
                                            points.push({ price: sc, pl: mp });
                                            points.push({ price: lc, pl: -ml });
                                            points.push({ price: lc + pad, pl: -ml });
                                          } else if (trade.strategy === 'Bull Put Spread') {
                                            const lp = trade.longStrike;
                                            const sp = trade.shortStrike;
                                            const mp = trade.maxProfit;
                                            const ml = trade.maxLoss;
                                            const pad = (sp - lp) * 2;
                                            points.push({ price: lp - pad, pl: -ml });
                                            points.push({ price: lp, pl: -ml });
                                            points.push({ price: sp, pl: mp });
                                            points.push({ price: sp + pad, pl: mp });
                                          } else if (trade.strategy === 'Bear Call Spread') {
                                            const sc = trade.shortStrike;
                                            const lc = trade.longStrike;
                                            const mp = trade.maxProfit;
                                            const ml = trade.maxLoss;
                                            const pad = (lc - sc) * 2;
                                            points.push({ price: sc - pad, pl: mp });
                                            points.push({ price: sc, pl: mp });
                                            points.push({ price: lc, pl: -ml });
                                            points.push({ price: lc + pad, pl: -ml });
                                          }
                                          return points;
                                        })()}
                                        margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
                                      >
                                        <defs>
                                          <linearGradient id={`plGrad-${trade.ticker}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="50%" stopColor="#10b981" stopOpacity={0.05} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                          dataKey="price"
                                          tickFormatter={(v) => `$${v}`}
                                          tick={{ fontSize: 11, fill: '#6b7280' }}
                                        />
                                        <YAxis
                                          tickFormatter={(v) => `$${v}`}
                                          tick={{ fontSize: 11, fill: '#6b7280' }}
                                        />
                                        <Tooltip
                                          formatter={(value) => [`$${value}`, 'P&L']}
                                          labelFormatter={(v) => `Price: $${v}`}
                                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                        />
                                        <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                                        {trade.breakeven != null && (
                                          <ReferenceLine x={trade.breakeven} stroke="#8b5cf6" strokeDasharray="5 5" label={{ value: `BE $${trade.breakeven}`, fill: '#8b5cf6', fontSize: 10, position: 'top' }} />
                                        )}
                                        {trade.upperBreakeven != null && (
                                          <ReferenceLine x={trade.upperBreakeven} stroke="#8b5cf6" strokeDasharray="5 5" label={{ value: `BE $${trade.upperBreakeven}`, fill: '#8b5cf6', fontSize: 10, position: 'top' }} />
                                        )}
                                        <Area
                                          type="linear"
                                          dataKey="pl"
                                          stroke="#6d28d9"
                                          strokeWidth={2}
                                          fill={`url(#plGrad-${trade.ticker}-${idx})`}
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}

                                {/* Rationale */}
                                {trade.rationale && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs font-medium text-amber-800 mb-1">Rationale</p>
                                    <p className="text-sm text-amber-700">{trade.rationale}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Spreads Summary */}
              {formData.strategyMode === 'spreads' && analysisResult.spreadsSummary && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Spreads Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    {analysisResult.spreadsSummary.totalStrategies != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{analysisResult.spreadsSummary.totalStrategies}</p>
                        <p className="text-xs text-gray-500">Strategies Analyzed</p>
                      </div>
                    )}
                    {analysisResult.spreadsSummary.avgProbabilityOfProfit != null && (
                      <div className="text-center p-3 bg-violet-50 rounded-lg">
                        <p className="text-2xl font-bold text-violet-600">{analysisResult.spreadsSummary.avgProbabilityOfProfit}%</p>
                        <p className="text-xs text-gray-500">Avg Prob. of Profit</p>
                      </div>
                    )}
                    {analysisResult.spreadsSummary.totalMaxProfit != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">${analysisResult.spreadsSummary.totalMaxProfit.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Max Profit</p>
                      </div>
                    )}
                    {analysisResult.spreadsSummary.totalBuyingPower != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">${analysisResult.spreadsSummary.totalBuyingPower.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Buying Power</p>
                      </div>
                    )}
                  </div>
                  {analysisResult.spreadsSummary.bestStrategy && (
                    <div className="px-4 pb-4">
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-violet-100 text-violet-700">
                        Best: {analysisResult.spreadsSummary.bestStrategy}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Trade Recommendations from API (Wheel mode) */}
              {formData.strategyMode !== 'pmcc' && formData.strategyMode !== 'spreads' && analysisResult.trades && analysisResult.trades.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Wheel Score™ Analysis</h2>
                  </div>

                  {analysisResult.trades.map((trade, index) => (
                    <div key={trade.ticker || index} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => setExpandedTrade(expandedTrade === trade.ticker ? null : trade.ticker)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            trade.wheelScore >= 8 ? 'bg-emerald-100' :
                            trade.wheelScore >= 7 ? 'bg-green-100' :
                            trade.wheelScore >= 6 ? 'bg-amber-100' :
                            'bg-gray-100'
                          }`}>
                            <span className={`font-bold ${
                              trade.wheelScore >= 8 ? 'text-emerald-700' :
                              trade.wheelScore >= 7 ? 'text-green-700' :
                              trade.wheelScore >= 6 ? 'text-amber-700' :
                              'text-gray-500'
                            }`}>{trade.wheelScore?.toFixed(1) || '—'}</span>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{trade.ticker}</p>
                              {trade.wheelScore && <StarRating rating={Math.round(trade.wheelScore / 2)} />}
                            </div>
                            <p className="text-sm text-gray-500">{trade.name || trade.recommendation || 'Analyzing...'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {trade.verdict && (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                trade.verdict === 'SELL' ? 'bg-green-100 text-green-700' :
                                trade.verdict === 'WAIT' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>{trade.verdict}</span>
                            )}
                            {trade.dailyReturn ? (
                              <p className={`text-sm mt-1 font-medium ${trade.dailyReturn >= 0.30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {trade.dailyReturn.toFixed(2)}%/day
                              </p>
                            ) : trade.premium ? (
                              <p className="text-sm text-gray-500 mt-1">${trade.premium} premium</p>
                            ) : null}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedTrade === trade.ticker ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Trade Details */}
                      {expandedTrade === trade.ticker && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                          {/* Trade Type & Expiry Frequency Badges */}
                          <div className="py-2 flex flex-wrap gap-2">
                            {trade.tradeType && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                {trade.tradeType}
                              </span>
                            )}
                            {trade.expiryFrequency && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                {trade.expiryFrequency}
                              </span>
                            )}
                            {trade.dte != null && trade.dte <= 7 && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                Short-Dated
                              </span>
                            )}
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                            {trade.currentPrice && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Current Price</p>
                                <p className="font-bold text-gray-900">${trade.currentPrice}</p>
                              </div>
                            )}
                            {trade.strike && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Strike Price</p>
                                <p className="font-bold text-gray-900">${trade.strike}</p>
                              </div>
                            )}
                            {trade.premium && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Premium</p>
                                <p className="font-bold text-emerald-600">${trade.premium}</p>
                              </div>
                            )}
                            {trade.dte && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Days to Expiry</p>
                                <p className="font-bold text-gray-900">{trade.dte} DTE</p>
                              </div>
                            )}
                            {trade.delta && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Delta</p>
                                <p className="font-bold text-gray-900">{trade.delta}</p>
                              </div>
                            )}
                            {trade.ivRank != null && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">IV Rank</p>
                                <p className={`font-bold ${trade.ivRank >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{trade.ivRank}%</p>
                              </div>
                            )}
                            {trade.collateralRequired && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Collateral Required</p>
                                <p className="font-bold text-gray-900">${trade.collateralRequired.toLocaleString()}</p>
                              </div>
                            )}
                            {trade.maxProfit && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Max Profit</p>
                                <p className="font-bold text-emerald-600">${trade.maxProfit}</p>
                              </div>
                            )}
                            {trade.breakeven && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Breakeven</p>
                                <p className="font-bold text-gray-900">${trade.breakeven}</p>
                              </div>
                            )}
                            {trade.dailyReturn && (
                              <div className={`rounded-lg p-3 border ${trade.dailyReturn >= 0.30 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                <p className="text-xs text-gray-500">Daily Return</p>
                                <p className={`font-bold ${trade.dailyReturn >= 0.30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {trade.dailyReturn.toFixed(2)}%/day {trade.dailyReturn >= 0.30 ? '✓' : '✗'}
                                </p>
                              </div>
                            )}
                            {trade.weeklyReturn && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Weekly Return</p>
                                <p className="font-bold text-emerald-600">{trade.weeklyReturn}%</p>
                              </div>
                            )}
                            {trade.monthlyReturn && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Monthly Return</p>
                                <p className="font-bold text-emerald-600">{trade.monthlyReturn}%</p>
                              </div>
                            )}
                            {trade.annualizedReturn && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Annualized Return</p>
                                <p className="font-bold text-emerald-600">{trade.annualizedReturn}%</p>
                              </div>
                            )}
                          </div>

                          {/* Expiration & Earnings Row */}
                          <div className="flex flex-wrap gap-4 mb-3 text-sm">
                            {trade.expirationDate && (
                              <div>
                                <span className="text-gray-500">Expiration: </span>
                                <span className="font-medium text-gray-700">{trade.expirationDate}</span>
                              </div>
                            )}
                            {trade.earningsDate && (
                              <div>
                                <span className="text-gray-500">Earnings: </span>
                                <span className="font-medium text-gray-700">{trade.earningsDate}</span>
                                {trade.earningsRisk && (
                                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                    trade.earningsRisk === 'HIGH' ? 'bg-red-100 text-red-700' :
                                    trade.earningsRisk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>{trade.earningsRisk} RISK</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Assignment Comfort */}
                          {trade.assignmentComfort && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-medium text-blue-800 mb-1">Assignment Comfort Test</p>
                              <p className="text-sm text-blue-700">{trade.assignmentComfort}</p>
                            </div>
                          )}

                          {/* Rationale */}
                          {trade.rationale && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-medium text-amber-800 mb-1">Analysis</p>
                              <p className="text-sm text-amber-700">{trade.rationale}</p>
                            </div>
                          )}

                          {/* Weekly Plan */}
                          {trade.weeklyPlan && (
                            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <p className="text-xs font-medium text-purple-800 mb-2">Weekly Trading Plan</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <p className="text-purple-500 text-xs">Trades/Week</p>
                                  <p className="font-bold text-purple-700">{trade.weeklyPlan.tradesPerWeek}x</p>
                                </div>
                                {trade.weeklyPlan.expiryDays && (
                                  <div>
                                    <p className="text-purple-500 text-xs">Expiry Days</p>
                                    <p className="font-bold text-purple-700">{trade.weeklyPlan.expiryDays.join(', ')}</p>
                                  </div>
                                )}
                                {trade.weeklyPlan.projectedWeeklyPremium && (
                                  <div>
                                    <p className="text-purple-500 text-xs">Weekly Premium</p>
                                    <p className="font-bold text-purple-700">${trade.weeklyPlan.projectedWeeklyPremium}</p>
                                  </div>
                                )}
                                {trade.weeklyPlan.projectedMonthlyPremium && (
                                  <div>
                                    <p className="text-purple-500 text-xs">Monthly Premium</p>
                                    <p className="font-bold text-purple-700">${trade.weeklyPlan.projectedMonthlyPremium}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Next Expiries */}
                          {trade.nextExpiries && trade.nextExpiries.length > 0 && (
                            <div className="mb-3 flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Next expiries:</span>
                              {trade.nextExpiries.map((exp, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                  {exp}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Risks */}
                          {trade.risks && trade.risks.length > 0 && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-medium text-red-800 mb-1">Risk Factors</p>
                              <ul className="text-sm text-red-700 list-disc list-inside">
                                {trade.risks.map((risk, i) => (
                                  <li key={i}>{risk}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Score Breakdown */}
                          {trade.scoreBreakdown && (
                            <div className="mb-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">Wheel Score Breakdown</p>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                {trade.scoreBreakdown.ivRank != null && (
                                  <div className="text-center">
                                    <p className="text-gray-500">IV Rank</p>
                                    <p className="font-bold text-gray-700">{trade.scoreBreakdown.ivRank}/2</p>
                                  </div>
                                )}
                                {trade.scoreBreakdown.premiumYield != null && (
                                  <div className="text-center">
                                    <p className="text-gray-500">Premium</p>
                                    <p className="font-bold text-gray-700">{trade.scoreBreakdown.premiumYield}/2</p>
                                  </div>
                                )}
                                {trade.scoreBreakdown.technicalSetup != null && (
                                  <div className="text-center">
                                    <p className="text-gray-500">Technicals</p>
                                    <p className="font-bold text-gray-700">{trade.scoreBreakdown.technicalSetup}/2</p>
                                  </div>
                                )}
                                {trade.scoreBreakdown.fundamentals != null && (
                                  <div className="text-center">
                                    <p className="text-gray-500">Fundamentals</p>
                                    <p className="font-bold text-gray-700">{trade.scoreBreakdown.fundamentals}/2</p>
                                  </div>
                                )}
                                {trade.scoreBreakdown.assignmentComfort != null && (
                                  <div className="text-center">
                                    <p className="text-gray-500">Comfort</p>
                                    <p className="font-bold text-gray-700">{trade.scoreBreakdown.assignmentComfort}/2</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Full Details (fallback for non-JSON responses) */}
                          {trade.details && (
                            <details className="mt-3">
                              <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                                View Full Analysis
                              </summary>
                              <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg">
                                <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono overflow-auto max-h-64">
                                  {trade.details}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Session Summary (from JSON) */}
              {analysisResult.summaryData && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Session Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    {analysisResult.summaryData.totalTrades != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{analysisResult.summaryData.totalTrades}</p>
                        <p className="text-xs text-gray-500">Trades Today</p>
                      </div>
                    )}
                    {(analysisResult.summaryData.totalPremiumThisTrade || analysisResult.summaryData.totalPremium) != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">${analysisResult.summaryData.totalPremiumThisTrade || analysisResult.summaryData.totalPremium}</p>
                        <p className="text-xs text-gray-500">Premium This Trade</p>
                      </div>
                    )}
                    {analysisResult.summaryData.projectedWeeklyPremium != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">${analysisResult.summaryData.projectedWeeklyPremium.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Projected Weekly</p>
                      </div>
                    )}
                    {analysisResult.summaryData.projectedMonthlyPremium != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">${analysisResult.summaryData.projectedMonthlyPremium.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Projected Monthly</p>
                      </div>
                    )}
                    {analysisResult.summaryData.avgDailyReturn != null && (
                      <div className={`text-center p-3 rounded-lg ${analysisResult.summaryData.avgDailyReturn >= 0.30 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <p className={`text-2xl font-bold ${analysisResult.summaryData.avgDailyReturn >= 0.30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {analysisResult.summaryData.avgDailyReturn.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">Avg Daily Return</p>
                      </div>
                    )}
                    {analysisResult.summaryData.totalCollateral != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">${analysisResult.summaryData.totalCollateral.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Collateral Used</p>
                      </div>
                    )}
                    {analysisResult.summaryData.portfolioYield != null && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">{analysisResult.summaryData.portfolioYield}%</p>
                        <p className="text-xs text-gray-500">Monthly Yield</p>
                      </div>
                    )}
                  </div>
                  {analysisResult.summaryData.riskLevel && (
                    <div className="px-4 pb-4">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        analysisResult.summaryData.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                        analysisResult.summaryData.riskLevel === 'MODERATE' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {analysisResult.summaryData.riskLevel} Risk
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Skip List (from JSON) */}
              {analysisResult.skipList && analysisResult.skipList.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Skip This Week</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {analysisResult.skipList.map((item, index) => (
                      <div key={item.ticker || index} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{item.ticker} {item.name && <span className="text-gray-500">- {item.name}</span>}</p>
                          <p className="text-sm text-red-600">{item.reason}</p>
                        </div>
                        {item.revisitDate && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Revisit: {item.revisitDate}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Watchlist Items (from JSON) */}
              {analysisResult.watchlistItems && analysisResult.watchlistItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Watch for Next Session</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {analysisResult.watchlistItems.map((item, index) => (
                      <div key={item.ticker || index} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{item.ticker} {item.name && <span className="text-gray-500">- {item.name}</span>}</p>
                            <p className="text-sm text-amber-600 mt-1">{item.triggerCondition}</p>
                          </div>
                          {item.potentialPremium && (
                            <span className="text-sm font-medium text-emerald-600">
                              ${item.potentialPremium} potential
                            </span>
                          )}
                        </div>
                        {(item.potentialStrike || item.currentIV) && (
                          <div className="mt-2 flex gap-4 text-xs text-gray-500">
                            {item.potentialStrike && <span>Strike: ${item.potentialStrike}</span>}
                            {item.currentIV && <span>Current IV: {item.currentIV}%</span>}
                            {item.targetIV && <span>Target IV: {item.targetIV}%</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Dates (from JSON) */}
              {analysisResult.keyDates && analysisResult.keyDates.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Key Dates</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {analysisResult.keyDates.map((item, index) => (
                      <div key={index} className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            item.impact === 'HIGH' ? 'bg-red-500' :
                            item.impact === 'MEDIUM' ? 'bg-amber-500' :
                            'bg-green-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{item.event}</p>
                            <p className="text-sm text-gray-500">{item.date}</p>
                          </div>
                        </div>
                        {item.action && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {item.action}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Snapshot (text fallback) */}
              {analysisResult.accountSnapshot && !analysisResult.summaryData && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Account Snapshot</h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {analysisResult.accountSnapshot}
                    </pre>
                  </div>
                </div>
              )}

              {/* Action Summary */}
              {analysisResult.actionSummary && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <h3 className="font-medium text-emerald-900 mb-3">Action Summary</h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-emerald-800 overflow-auto">
                      {analysisResult.actionSummary}
                    </pre>
                  </div>
                </div>
              )}

              {/* Income Dashboard */}
              {analysisResult.incomeDashboard && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Income Dashboard</h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {analysisResult.incomeDashboard}
                    </pre>
                  </div>
                </div>
              )}

              {/* Full Analysis */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3">Full Analysis</h3>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]">
                    {analysisResult.fullAnalysis || 'No detailed analysis available.'}
                  </pre>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="text-center py-12 space-y-6">
            {formData.strategyMode === 'pmcc' ? (
              <TrendingUp className="w-16 h-16 text-teal-500 mx-auto" />
            ) : formData.strategyMode === 'spreads' ? (
              <Layers className="w-16 h-16 text-violet-500 mx-auto" />
            ) : (
              <RefreshCw className="w-16 h-16 text-emerald-500 mx-auto" />
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {formData.strategyMode === 'pmcc' ? 'Ready to Scan for PMCC' : formData.strategyMode === 'spreads' ? 'Ready to Scan Spreads' : 'Ready to Analyze'}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {formData.strategyMode === 'pmcc'
                ? 'We\'ll identify LEAPS candidates and pair them with short calls for capital-efficient income.'
                : formData.strategyMode === 'spreads'
                ? 'We\'ll analyse Bull Put Spreads, Bear Call Spreads, and Iron Condors with P&L profiles.'
                : 'The Wheel Committee will calculate Wheel Scores™ and find the best premium opportunities.'}
            </p>
            <button
              onClick={runAnalysis}
              className={`px-8 py-4 text-white font-medium rounded-xl transition-colors shadow-lg ${
                formData.strategyMode === 'spreads'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
              }`}
            >
              {formData.strategyMode === 'pmcc' ? 'Find PMCC Opportunities' : formData.strategyMode === 'spreads' ? 'Find Spread Opportunities' : 'Find Wheel Opportunities'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className={`mx-auto ${analysisComplete ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Progress Steps */}
        {step > 0 && step < 5 && (
          <div className="flex items-center justify-between mb-8">
            {steps.slice(1, 5).map((s, i) => (
              <React.Fragment key={s.title}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      i + 1 < step
                        ? 'bg-green-500 text-white'
                        : i + 1 === step
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1 < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs mt-1 text-gray-500">{s.title}</span>
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        {!isAnalyzing && !analysisComplete && (
          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div />
            )}
            {step < 5 && (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
              >
                {step === 0 ? 'Get Started' : step === 4 ? 'Run Analysis' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {analysisComplete && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setStep(0);
                setAnalysisComplete(false);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Start New Analysis
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>The Wheel Committee • US Markets Only • Educational Tool • Not Financial Advice</p>
        </div>
      </div>
    </div>
  );
}
