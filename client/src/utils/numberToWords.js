/**
 * Convert a number to words (for invoice amounts)
 * Supports up to 999,999,999,999.99
 */
export function numberToWords(num) {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertHundreds(n) {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  }
  
  function convertThousands(n) {
    if (n < 1000) {
      return convertHundreds(n);
    }
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = convertHundreds(thousands) + ' Thousand ';
    if (remainder > 0) {
      result += convertHundreds(remainder);
    }
    return result.trim();
  }
  
  function convertLakhs(n) {
    if (n < 100000) {
      return convertThousands(n);
    }
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    let result = convertHundreds(lakhs) + ' Lakh ';
    if (remainder > 0) {
      result += convertThousands(remainder);
    }
    return result.trim();
  }
  
  function convertCrores(n) {
    if (n < 10000000) {
      return convertLakhs(n);
    }
    const crores = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    let result = convertHundreds(crores) + ' Crore ';
    if (remainder > 0) {
      result += convertLakhs(remainder);
    }
    return result.trim();
  }
  
  // Handle decimal part
  const parts = num.toString().split('.');
  const integerPart = Math.floor(num);
  const decimalPart = parts.length > 1 ? parseInt(parts[1].substring(0, 2).padEnd(2, '0')) : 0;
  
  let words = '';
  
  if (integerPart >= 10000000) {
    words = convertCrores(integerPart);
  } else if (integerPart >= 100000) {
    words = convertLakhs(integerPart);
  } else if (integerPart >= 1000) {
    words = convertThousands(integerPart);
  } else {
    words = convertHundreds(integerPart);
  }
  
  // Add currency suffix
  words += ' Rupees';
  
  if (decimalPart > 0) {
    const paiseWords = convertHundreds(decimalPart);
    words += ' ' + paiseWords + ' Paise';
  }
  
  words += ' Only';
  
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
