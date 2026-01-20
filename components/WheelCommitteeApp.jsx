import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ChevronRight, ChevronLeft, 
  Check, Loader2, Target, BarChart2, ChevronDown, Activity, 
  BarChart3, AlertTriangle, Eye, Calendar, BookOpen,
  Repeat, ArrowRight, ArrowDown, Star, Shield, Clock,
  PieChart, Wallet, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Award, Zap, Brain
} from 'lucide-react';

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
    targetDte: '35',
    marketOutlook: 'neutral',
  });

  const steps = [
    { title: 'Welcome', icon: BookOpen },
    { title: 'Account', icon: Wallet },
    { title: 'Positions', icon: BarChart3 },
    { title: 'Watchlist', icon: Eye },
    { title: 'Settings', icon: Target },
    { title: 'Analysis', icon: Brain },
  ];

  const analysisSteps = [
    'Loading account data...',
    'Checking buying power...',
    'Calculating current exposure...',
    'Analyzing AAPL...',
    'Analyzing MSFT...',
    'Analyzing KO...',
    'Analyzing PEP...',
    'Analyzing JNJ...',
    'Computing Wheel Scores™...',
    'Checking earnings dates...',
    'Screening IV Rank...',
    'Selecting optimal strikes...',
    'Calculating premiums...',
    'Running Assignment Comfort Test...',
    'Ranking opportunities...',
    'Generating recommendations...',
  ];

  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setCurrentAnalysisStep(0);
    setAnalysisError(null);

    // Animate through steps while waiting for API
    const interval = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= analysisSteps.length - 1) return prev;
        return prev + 1;
      });
    }, 800);

    try {
      const response = await fetch('/api/analyze', {
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

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                <strong>Settings Summary:</strong> Targeting ~{parseFloat(formData.targetDelta) * 100}% delta puts, 
                {formData.targetDte} DTE, on stocks scoring {formData.minWheelScore}+. 
                Goal: ${parseInt(formData.targetMonthlyIncome).toLocaleString()}/month in premium.
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
              <h2 className="text-2xl font-bold text-gray-900">Wheel Committee in Session</h2>

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
                      {analysisResult.mode || (formData.mode === 'cash_secured' ? 'Cash-Secured Mode' : 'Margin Mode')} • {formData.watchlist.split('\n').filter(t => t.trim()).length} stocks analyzed
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

              {/* Trade Recommendations from API */}
              {analysisResult.trades && analysisResult.trades.length > 0 && (
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
                            {trade.premium && (
                              <p className="text-sm text-gray-500 mt-1">${trade.premium} premium</p>
                            )}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedTrade === trade.ticker ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Account Snapshot */}
              {analysisResult.accountSnapshot && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Account Snapshot</h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {analysisResult.accountSnapshot}
                    </pre>
                  </div>
                </div>
              )}

              {/* Recommended Trades Section */}
              {analysisResult.recommendedTrades && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Recommended Trades</h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {analysisResult.recommendedTrades}
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
            <RefreshCw className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Ready to Analyze</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The Wheel Committee will calculate Wheel Scores™ and find the best premium opportunities.
            </p>
            <button
              onClick={runAnalysis}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors shadow-lg"
            >
              Find Wheel Opportunities
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
