import Papa from 'papaparse';

export interface RawCsvRow {
  date?: string;
  description?: string;
  amount?: string | number;
  type?: string;
  category?: string;
  balance?: string | number;
  [key: string]: any;
}

export interface ParsedTransaction {
  date: Date;
  dateString: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  balance: number;
  referenceId: string;
}

export interface CsvParseResult {
  validTransactions: ParsedTransaction[];
  importedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  errors: string[];
}

export function parseTransactionCsv(
  csvContent: string,
  existingReferences: Set<string> = new Set()
): CsvParseResult {
  const result = Papa.parse<RawCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''),
  });

  const validTransactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  const seenInBatch = new Set<string>();

  let importedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 2; // account for header line + 1-index

    // Find date
    const rawDate = row.date || row.transactiondate || row.txndate || row.datetime;
    if (!rawDate) {
      rejectedCount++;
      errors.push(`Row ${rowNum}: Missing transaction date`);
      continue;
    }

    const parsedDate = parseDateString(String(rawDate));
    if (!parsedDate) {
      rejectedCount++;
      errors.push(`Row ${rowNum}: Invalid date format "${rawDate}"`);
      continue;
    }

    // Find amount
    const rawAmount = row.amount || row.txnamount || row.value;
    const amountNum = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      rejectedCount++;
      errors.push(`Row ${rowNum}: Invalid amount "${rawAmount}"`);
      continue;
    }

    // Find description
    const description = (row.description || row.desc || row.narration || row.particulars || 'Transaction').trim();

    // Determine type (INCOME vs EXPENSE)
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
    const rawType = (row.type || row.txntype || row.crdr || row.creditdebit || '').toLowerCase().trim();
    if (
      rawType.includes('in') ||
      rawType.includes('cr') ||
      rawType.includes('credit') ||
      rawType.includes('deposit') ||
      rawType === 'c'
    ) {
      type = 'INCOME';
    } else if (
      rawType.includes('out') ||
      rawType.includes('dr') ||
      rawType.includes('debit') ||
      rawType.includes('withdrawal') ||
      rawType === 'd'
    ) {
      type = 'EXPENSE';
    } else {
      // Guess from description or default to income if positive and typical keyword
      const descLower = description.toLowerCase();
      if (
        descLower.includes('trip') ||
        descLower.includes('fare') ||
        descLower.includes('payout') ||
        descLower.includes('salary') ||
        descLower.includes('upi in') ||
        descLower.includes('qr payment received')
      ) {
        type = 'INCOME';
      } else {
        type = 'EXPENSE';
      }
    }

    // Category
    const category = (row.category || (type === 'INCOME' ? 'Gig Earnings' : 'General Expense')).trim();

    // Balance
    const rawBalance = row.balance || row.closingbalance || row.accbalance;
    let balance = parseFloat(String(rawBalance).replace(/[^0-9.-]/g, ''));
    if (isNaN(balance)) {
      balance = type === 'INCOME' ? amountNum : 0;
    }

    // Reference & Duplicate checking
    const dateStr = parsedDate.toISOString().split('T')[0];
    const hashKey = `${dateStr}_${amountNum}_${type}_${description.slice(0, 20)}`;

    if (seenInBatch.has(hashKey) || existingReferences.has(hashKey)) {
      duplicateCount++;
      continue;
    }

    seenInBatch.add(hashKey);

    validTransactions.push({
      date: parsedDate,
      dateString: dateStr,
      description,
      amount: amountNum,
      type,
      category,
      balance,
      referenceId: hashKey,
    });

    if (type === 'INCOME') {
      totalIncome += amountNum;
    } else {
      totalExpenses += amountNum;
    }

    importedCount++;
  }

  return {
    validTransactions,
    importedCount,
    rejectedCount,
    duplicateCount,
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    netCashFlow: Math.round(totalIncome - totalExpenses),
    errors: errors.slice(0, 10), // Limit error list
  };
}

function parseDateString(dateStr: string): Date | null {
  const clean = dateStr.trim();
  // Try direct ISO
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d;

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(parsed.getTime())) return parsed;
    } else {
      // DD-MM-YYYY
      const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}
