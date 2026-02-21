/** Shared A4 receipt print styles - must match A4Receipt preview exactly. Includes Tailwind-like utilities for print iframe (no external CSS). */
export const getA4ReceiptPrintStyles = () => `
  @page {
    size: A4;
    margin: 8mm;
  }
  *, *::before, *::after { box-sizing: border-box; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html {
    zoom: 1 !important;
    overflow: hidden !important;
    width: 210mm !important;
    min-width: 210mm !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    width: 210mm !important;
    min-width: 210mm !important;
    max-width: 210mm !important;
    overflow: hidden !important;
    font-family: Arial, sans-serif !important;
  }
  .a4-scale-wrapper {
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    display: block !important;
    overflow: hidden !important;
  }
  .a4-sheet {
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: 210mm !important;
    transform: none !important;
    transform-origin: top left !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    margin: 0 auto !important;
    padding: 10mm !important;
    box-sizing: border-box !important;
    background: white !important;
    color: black !important;
    font-family: Arial, sans-serif !important;
    font-size: 9pt !important;
    line-height: 1.3 !important;
    display: block !important;
    page-break-inside: avoid !important;
  }
  .a4-sheet * {
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
    color-adjust: exact !important; -webkit-font-smoothing: antialiased !important;
  }
  .a4-sheet p, .a4-sheet span, .a4-sheet div, .a4-sheet h1, .a4-sheet h2, .a4-sheet h3,
  .a4-sheet td, .a4-sheet th { text-shadow: none !important; filter: none !important; }
  .a4-sheet table { border-collapse: collapse !important; width: 100% !important; table-layout: auto !important; }
  .a4-sheet th, .a4-sheet td { padding: 8px 8px !important; text-align: left !important; font-size: 9pt !important; line-height: 1.3 !important; }
  .a4-sheet th {
    background-color: #1e40af !important; color: white !important; font-weight: bold !important;
  }
  .a4-sheet img, .a4-sheet svg { max-width: 100% !important; height: auto !important; }
  /* Tailwind-like utilities used by A4Receipt - required for print iframe (no external CSS load) */
  .flex { display: flex !important; }
  .flex-col { flex-direction: column !important; }
  .grid { display: grid !important; }
  .block { display: block !important; }
  .justify-between { justify-content: space-between !important; }
  .justify-center { justify-content: center !important; }
  .items-start { align-items: flex-start !important; }
  .items-baseline { align-items: baseline !important; }
  .items-center { align-items: center !important; }
  .items-end { align-items: flex-end !important; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
  .text-left { text-align: left !important; }
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .text-black { color: #000 !important; }
  .text-white { color: #fff !important; }
  .text-gray-600 { color: rgb(75 85 99) !important; }
  .font-bold { font-weight: 700 !important; }
  .font-semibold { font-weight: 600 !important; }
  .font-medium { font-weight: 500 !important; }
  .uppercase { text-transform: uppercase !important; }
  .rounded { border-radius: 0.25rem !important; }
  .w-full { width: 100% !important; }
  .w-8 { width: 2rem !important; }
  .h-8 { height: 2rem !important; }
  .w-9 { width: 2.25rem !important; }
  .h-9 { height: 2.25rem !important; }
  .mx-auto { margin-left: auto !important; margin-right: auto !important; }
  .flex-shrink-0 { flex-shrink: 0 !important; }
  .object-contain { object-fit: contain !important; }
  .border-b { border-bottom-width: 1px !important; }
  .border-gray-200 { border-color: rgb(229 231 235) !important; }
  .border-gray-300 { border-color: rgb(209 213 219) !important; }
  .border-gray-400 { border-color: rgb(156 163 175) !important; }
  .border-t-2 { border-top-width: 2px !important; }
  .gap-1\\.5 { gap: 0.375rem !important; }
  .rounded-full { border-radius: 50% !important; }
  .pt-0\\.5 { padding-top: 0.125rem !important; }
  .mt-1 { margin-top: 0.25rem !important; }
  @media print {
    @page { size: A4; margin: 0; }
    html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
    .a4-scale-wrapper, .a4-sheet { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

export const getReceiptPrintStyles = (paperSize = '80mm') => {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @media print {
      @page {
        size: ${paperSize} auto;
        margin: 0;
        padding: 0;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: ${paperSize};
        height: auto;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.2;
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        overflow: visible;
        max-width: ${paperSize};
      }
      .receipt-wrapper {
        width: 100%;
        padding: 6px 2px 6px 4px;
        border: none;
        margin: 0;
        box-sizing: border-box;
        page-break-after: auto;
        overflow: visible;
      }
      
      .receipt-print {
        margin: 0;
        padding: 0;
      }
      
      .receipt-footer {
        page-break-inside: avoid;
        margin-bottom: 0;
      }
      
      /* Remove any extra space after footer */
      .receipt-footer::after {
        content: '';
        display: none;
      }
    }
    
    body {
      margin: 0;
      padding: 0;
      width: ${paperSize};
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.2;
      color: #000 !important;
      background: #fff;
    }
    
    .receipt-wrapper {
      width: 100%;
      max-width: ${paperSize};
      padding: 6px 2px 6px 4px;
      border: none;
      margin: 0 auto;
      background: #fff;
      box-sizing: border-box;
      overflow: visible;
    }
    
    .receipt-header {
      text-align: center;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .receipt-logo {
      margin-bottom: 6px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    
    .logo-img {
      max-width: 150px;
      max-height: 110px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    
    .receipt-title {
      font-size: 20px;
      font-weight: 900;
      margin: 8px 0 6px 0;
      color: #000 !important;
      letter-spacing: 0.5px;
      line-height: 1.3;
      text-transform: uppercase;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-trn {
      font-size: 12px;
      font-weight: 700;
      margin: 4px 0;
      color: #000 !important;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-address {
      font-size: 12px;
      font-weight: 700;
      margin: 4px 0;
      color: #000 !important;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-contact {
      font-size: 11px;
      font-weight: 700;
      margin: 4px 0;
      color: #000 !important;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt-tax {
      font-size: 12px;
      font-weight: 800;
      margin: 4px 0;
      text-transform: uppercase;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-divider {
      border-top: 1.5px dashed #333;
      margin: 6px 0;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-divider-thick {
      border-top: 2px solid #000;
      margin: 5px 0;
      width: 100%;
    }
    
    .receipt-section {
      margin: 5px 0;
    }
    
    .receipt-row {
      display: flex;
      align-items: center;
      margin: 2px 0;
      font-size: 11px;
      line-height: 1.3;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: visible;
    }
    
    .receipt-label {
      font-weight: 700;
      color: #000 !important;
      text-transform: uppercase;
      flex: 1;
      min-width: 0;
      padding-right: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-spacer-rate {
      width: 50px;
      flex-shrink: 0;
      padding-right: 12px;
    }
    
    .receipt-spacer-qty {
      width: 25px;
      flex-shrink: 0;
      padding-right: 3px;
    }
    
    .receipt-value {
      font-weight: 700;
      color: #000 !important;
      text-align: right;
      white-space: nowrap;
      flex: 0 0 auto;
      min-width: 55px;
      padding-right: 0;
      overflow: visible;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-value.discount {
      color: #000 !important;
    }
    
    .receipt-subtotal {
      font-size: 12px;
    }
    
    .receipt-subtotal-label {
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-subtotal-value {
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-total {
      font-size: 14px;
      font-weight: bold;
      margin-top: 4px;
    }
    
    .total-amount {
      font-size: 18px;
      font-weight: bold;
    }
    
    .receipt-items {
      margin: 3px 0;
    }
    
    .receipt-items-header {
      display: flex;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
      font-weight: 900;
      font-size: 11px;
      align-items: center;
      line-height: 1.3;
      width: 100%;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-items-header .item-name {
      text-align: left;
      flex: 1;
      min-width: 0;
      padding-right: 4px;
      overflow: hidden;
      font-weight: 900;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-items-header .item-rate {
      text-align: right;
      width: 50px;
      flex-shrink: 0;
      padding-right: 12px;
      font-weight: 900;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-items-header .item-qty {
      text-align: center;
      width: 25px;
      flex-shrink: 0;
      padding-right: 3px;
      font-weight: 900;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-items-header .item-amount {
      text-align: right;
      flex: 0 0 auto;
      min-width: 55px;
      padding-right: 0;
      font-weight: 900;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-item-row {
      display: flex;
      align-items: center;
      padding: 3px 0;
      border-bottom: none;
      font-size: 11px;
      line-height: 1.3;
      min-height: 18px;
      width: 100%;
      box-sizing: border-box;
    }
    
    .receipt-vat-row {
      font-size: 10px;
      padding: 1px 0;
      min-height: 14px;
    }
    
    .item-col {
      color: #000 !important;
      line-height: 1.3;
      font-weight: 900;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .item-name {
      flex: 1;
      min-width: 0;
      text-align: left;
      padding-right: 4px;
      overflow: hidden;
    }
    
    .item-name-text {
      display: block;
      font-weight: 900;
      color: #000 !important;
      font-size: 11px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .item-rate {
      width: 50px;
      text-align: right;
      font-weight: 900;
      color: #000 !important;
      flex-shrink: 0;
      font-size: 11px;
      padding-right: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .item-qty {
      width: 25px;
      text-align: center;
      font-weight: 900;
      color: #000 !important;
      flex-shrink: 0;
      font-size: 11px;
      padding-right: 3px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .item-amount {
      flex: 0 0 auto;
      min-width: 55px;
      text-align: right;
      font-weight: 900;
      color: #000 !important;
      font-size: 11px;
      padding-right: 0;
      white-space: nowrap;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-totals {
      margin: 3px 0;
    }
    
    .receipt-order-type-wrapper {
      margin: 4px 0 3px 0;
      width: 100%;
      box-sizing: border-box;
    }
    
    .receipt-order-type {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 3px 0;
      color: #000 !important;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.3;
      padding: 0 3px;
    }
    
    .receipt-bill-number-line {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 3px 0;
      color: #000 !important;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.3;
      padding: 0 3px;
      max-width: 100%;
    }
    
    .receipt-bill-date-wrapper {
      text-align: center;
      font-size: 14px;
      margin: 0 0 4px 0;
      color: #000 !important;
      font-weight: 700;
      width: 100%;
      box-sizing: border-box;
      padding: 0 3px;
    }
    
    .receipt-bill-date {
      text-align: right;
      white-space: nowrap;
      color: #000 !important;
      line-height: 1.2;
    }
    
    .receipt-bill-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 4px 0;
      color: #000 !important;
      font-weight: 600;
      width: 100%;
      box-sizing: border-box;
    }
    
    .receipt-bill-number {
      text-align: left;
      white-space: nowrap;
      flex-shrink: 0;
    }
    
    .receipt-footer {
      text-align: center;
      margin-top: 6px;
      padding-top: 4px;
      padding-bottom: 5px;
      page-break-inside: avoid;
    }
    
    .receipt-thanks {
      font-size: 11px;
      font-weight: 600;
      margin: 4px 0 2px 0;
      color: #000 !important;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      padding: 0 2px;
      text-align: center;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    
    .receipt-nice-day {
      font-size: 11px;
      font-weight: 600;
      margin: 3px 0;
      color: #000 !important;
      line-height: 1.3;
    }
    
    .receipt-software {
      font-size: 11px;
      font-weight: 700;
      margin: 4px 0 2px 0;
      color: #000 !important;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: break-word;
      padding: 0 4px;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt-phone {
      font-size: 11px;
      font-weight: 700;
      color: #000 !important;
      margin-top: 2px;
      margin-bottom: 0;
      line-height: 1.3;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .capitalize {
      text-transform: capitalize;
    }
  `;
};
