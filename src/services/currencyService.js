
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const CACHE_KEY_RATES = 'zen_currency_rates';
const CACHE_KEY_LIST = 'zen_currency_list';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export const CurrencyService = {
  /**
   * Fetch the list of available currencies (code: name)
   */
  async getCurrencies() {
    try {
      // Check cache
      const cached = localStorage.getItem(CACHE_KEY_LIST);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION * 7) { // Cache list for a week
          return data;
        }
      }

      const response = await fetch(`${BASE_URL}/currencies.json`);
      if (!response.ok) throw new Error('Failed to fetch currencies');
      
      const data = await response.json();
      
      // Filter out some obvious non-fiat if needed, but for now we keep all
      // We might want to prioritize common ones in the UI
      
      localStorage.setItem(CACHE_KEY_LIST, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    } catch (error) {
      console.error('CurrencyService Error:', error);
      // Fallback to basic list if fetch fails
      return { usd: 'United States Dollar', eur: 'Euro', gbp: 'British Pound', jpy: 'Japanese Yen', inr: 'Indian Rupee', cad: 'Canadian Dollar', aud: 'Australian Dollar' };
    }
  },

  /**
   * Fetch exchange rates (Base is always USD for cross-calculation)
   */
  async getRates() {
    try {
      const cached = localStorage.getItem(CACHE_KEY_RATES);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // If less than 24h old, use cache
        if (Date.now() - timestamp < CACHE_DURATION) {
          return { rates: data, timestamp, isStale: false };
        }
        // If older, try to fetch but return cached if fetch fails (stale-while-revalidate pattern handled by caller or simple stale return)
        // For simplicity: Return stale if fetch fails
      }

      const response = await fetch(`${BASE_URL}/currencies/usd.json`);
      if (!response.ok) throw new Error('Failed to fetch rates');
      
      const json = await response.json();
      const rates = json.usd; // API returns { date: "...", usd: { ... } }

      localStorage.setItem(CACHE_KEY_RATES, JSON.stringify({
        data: rates,
        timestamp: Date.now()
      }));

      return { rates, timestamp: Date.now(), isStale: false };
    } catch (error) {
      console.error('CurrencyService Error:', error);
      
      // Try to return stale cache
      const cached = localStorage.getItem(CACHE_KEY_RATES);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        return { rates: data, timestamp, isStale: true };
      }
      
      throw error;
    }
  },

  /**
   * Convert amount from one currency to another using USD as base
   */
  convert(amount, fromCurrency, toCurrency, rates) {
    if (!rates) return null;
    
    const from = fromCurrency.toLowerCase();
    const to = toCurrency.toLowerCase();
    
    // If same currency
    if (from === to) return amount;

    // Get rates (relative to USD)
    // 1 USD = X From
    // 1 USD = Y To
    
    let rateFrom = rates[from];
    let rateTo = rates[to];

    // Handle USD explicitly if it's not in the rates object (sometimes it is, sometimes implicit 1)
    if (from === 'usd') rateFrom = 1;
    if (to === 'usd') rateTo = 1;

    if (!rateFrom || !rateTo) return null;

    // Convert From -> USD -> To
    // AmountInUSD = Amount / RateFrom
    // Result = AmountInUSD * RateTo
    return (amount / rateFrom) * rateTo;
  },

  /**
   * Detect user's currency based on locale
   */
  detectUserCurrency() {
    try {
      return Intl.NumberFormat().resolvedOptions().currency || 'USD';
    } catch (e) {
      return 'USD';
    }
  },

  /**
   * Format currency for display
   */
  format(amount, currency) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Parse input string like "100 usd to eur" or "50 cad"
   * Handles loose formatting, commas, currency symbols, and typos
   */
  parseInput(input) {
    if (!input) return null;

    // 1. Normalize Input
    let cleaned = input.trim();
    // Remove currency symbols ($, €, £, ¥, ₹, etc.) BUT replace with space to avoid merging with numbers if tight
    cleaned = cleaned.replace(/[$€£¥₹₽₩]/g, ' '); 
    // Remove commas from numbers
    cleaned = cleaned.replace(/,/g, ''); 
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Regex for parsing:
    // Group 1: Amount (can be decimal)
    // Group 2: From Currency (2-4 chars to catch typos like 'usdd')
    // Group 3: Separator (to, in, ->) - optional
    // Group 4: To Currency - optional
    
    const parserRegex = /^(\d+(?:\.\d+)?)\s*([a-z]{2,4})(?:\s+(?:to|in|->)\s+([a-z]{2,4}))?$/i;
    const match = cleaned.match(parserRegex);

    if (!match) return null;

    const rawAmount = parseFloat(match[1]);
    const rawFrom = match[2];
    const rawTo = match[3];

    // Typo Correction Helper
    const correctCode = (code) => {
      if (!code) return { code: null, original: null, corrected: false };
      
      const upper = code.toUpperCase();
      // If valid ISO code (length 3), check if it exists in common list or generic list
      // For now, we assume standard 3-letter codes.
      
      // Heuristic: If it's a valid 3 letter code, keep it.
      // If it's a common typo (e.g. 'uds'), fix it.
      
      const commonTypos = {
        'UDS': 'USD',
        'US': 'USD',
        'EURO': 'EUR',
        'EU': 'EUR',
        'UK': 'GBP',
        'RMB': 'CNY',
        'YEN': 'JPY',
        'RUPEE': 'INR',
        'CADD': 'CAD',
        'AUDD': 'AUD'
      };

      if (commonTypos[upper]) return { code: commonTypos[upper], original: code, corrected: true };

      // Swap adjacent chars check (e.g. 'uds' -> 'usd')
      // Only do this for 3-letter codes to avoid false positives on 2/4 letter inputs
      if (upper.length === 3) {
          const validCodes = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CNY', 'CHF', 'NZD']; // Short list for safe auto-correction
          if (validCodes.includes(upper)) return { code: upper, original: code, corrected: false };
          
          for (const valid of validCodes) {
              // Check if valid is an anagram of upper (very basic fuzzy)
              if (valid.split('').sort().join('') === upper.split('').sort().join('')) {
                  return { code: valid, original: code, corrected: true };
              }
          }
      }

      // Default: Return as uppercase if 3 letters, else ignore or return null if strictly enforcing
      // Returning as-is allows the API to fail gracefully if invalid, or succeed if it's a real code we didn't whitelist above
      return { code: upper, original: code, corrected: false };
    };

    const fromData = correctCode(rawFrom);
    const toData = correctCode(rawTo);

    return {
      amount: rawAmount,
      from: fromData.code,
      to: toData.code, // Null if implicit
      fromSuggested: fromData.corrected,
      toSuggested: toData.corrected,
      originalFrom: fromData.original,
      originalTo: toData.original
    };
  }
};
