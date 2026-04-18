import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';
import { Download, Printer, RefreshCw, Search, Wand2 } from 'lucide-react';
import api from '../api/api';
import { useSettings } from '../contexts/SettingsContext';

export default function BarcodeGenerator() {
  const { formatCurrency } = useSettings();
  const svgRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeLabel, setBarcodeLabel] = useState('');
  const [barcodePrice, setBarcodePrice] = useState('');
  const [autoGenerateMode, setAutoGenerateMode] = useState(true);
  const [showTextOnBarcode, setShowTextOnBarcode] = useState(true);
  const [showNameInText, setShowNameInText] = useState(true);
  const [showBarcodeInText, setShowBarcodeInText] = useState(true);
  const [showPriceInText, setShowPriceInText] = useState(false);
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(80);
  const [barcodeMargin, setBarcodeMargin] = useState(10);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const barcode = String(product.barcode || '').toLowerCase();
      const category = String(product.category_name || '').toLowerCase();
      return name.includes(q) || barcode.includes(q) || category.includes(q);
    });
  }, [products, productSearch]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const getNextAutoBarcode = () => {
    // 13-digit numeric code: timestamp tail + random tail, good for CODE128 and EAN-like labels.
    const timestampPart = Date.now().toString().slice(-9);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestampPart}${randomPart}`;
  };

  const getRenderText = () => {
    // We render multiline details outside of JsBarcode for precise line control.
    return '';
  };

  const getDisplayLines = () => {
    if (!showTextOnBarcode) return [];
    const lines = [];
    if (showNameInText && barcodeLabel.trim()) lines.push(barcodeLabel.trim());
    if (showBarcodeInText && barcodeValue.trim()) lines.push(barcodeValue.trim());
    if (showPriceInText && String(barcodePrice).trim()) {
      const parsed = Number(barcodePrice);
      if (Number.isFinite(parsed)) {
        lines.push(formatCurrency(parsed));
      } else {
        lines.push(String(barcodePrice).trim());
      }
    }
    return lines;
  };

  const renderBarcode = (showSuccessToast = false) => {
    if (!svgRef.current || !barcodeValue.trim()) return;
    try {
      JsBarcode(svgRef.current, barcodeValue.trim(), {
        format: 'CODE128',
        displayValue: false,
        text: getRenderText(),
        background: '#ffffff',
        lineColor: '#111827',
        margin: barcodeMargin,
        width: barcodeWidth,
        height: barcodeHeight
      });
      if (showSuccessToast) toast.success('Barcode generated');
    } catch (error) {
      if (showSuccessToast) toast.error('Invalid barcode value');
      console.error('Barcode render failed:', error);
    }
  };

  useEffect(() => {
    renderBarcode(false);
    // Live preview updates while values/options change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    barcodeValue,
    barcodeLabel,
    barcodePrice,
    showTextOnBarcode,
    showNameInText,
    showBarcodeInText,
    showPriceInText,
    barcodeWidth,
    barcodeHeight,
    barcodeMargin
  ]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error loading products for barcode generator:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductChange = (value) => {
    setSelectedProductId(value);
    if (!value) {
      if (autoGenerateMode) {
        setBarcodeValue(getNextAutoBarcode());
      }
      return;
    }

    const product = products.find((item) => String(item.id) === String(value));
    if (!product) return;

    const productBarcode = String(product.barcode || '').trim();
    if (productBarcode) {
      setBarcodeValue(productBarcode);
    } else {
      if (autoGenerateMode) {
        const generated = getNextAutoBarcode();
        setBarcodeValue(generated);
        toast.success('No product barcode found. Auto-generated one for live preview.');
      } else {
        setBarcodeValue('');
        toast('No barcode found for selected product. Use Auto or enter manually.');
      }
    }

    setBarcodeLabel(product.name || '');
    setBarcodePrice(product.price != null ? String(product.price) : '');
    setProductSearch(product.name || '');
    setShowProductResults(false);
  };

  const handleAutoRegenerate = () => {
    const generated = getNextAutoBarcode();
    setBarcodeValue(generated);
    toast.success('Barcode regenerated');
  };

  const handleGenerate = () => {
    if (!barcodeValue.trim()) {
      toast.error('Please enter a barcode value');
      return;
    }
    renderBarcode(true);
  };

  const handleDownload = () => {
    if (!svgRef.current || !barcodeValue.trim()) {
      toast.error('Generate a barcode first');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);

      const link = document.createElement('a');
      const safeLabel = (barcodeLabel || barcodeValue || 'barcode')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .toLowerCase();
      link.download = `${safeLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handlePrint = () => {
    if (!svgRef.current || !barcodeValue.trim()) {
      toast.error('Generate a barcode first');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=620');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }

    const printSvg = svgRef.current.cloneNode(true);
    printSvg.setAttribute('width', '100%');
    printSvg.setAttribute('height', '100%');
    const svgMarkup = printSvg.outerHTML;
    const textLines = getDisplayLines();
    const textMarkup = textLines
      .map((line) => `<div class="meta-line">${String(line).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`)
      .join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              font-family: Arial, sans-serif;
            }
            .label {
              width: 50mm;
              height: 30mm;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 0.5mm;
            }
            .barcode {
              width: 100%;
              height: 18mm;
            }
            .barcode svg {
              width: 100%;
              height: 100%;
              display: block;
            }
            .meta {
              width: 100%;
              text-align: center;
              font-size: 9px;
              line-height: 1.15;
            }
            .meta-line {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="barcode">${svgMarkup}</div>
            <div class="meta">${textMarkup}</div>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
                window.close();
              }, 120);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    setSelectedProductId('');
    setProductSearch('');
    setShowProductResults(false);
    setBarcodeValue('');
    setBarcodeLabel('');
    setBarcodePrice('');
    if (svgRef.current) {
      svgRef.current.innerHTML = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Barcode Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create printable product barcodes (CODE128) for labels and packaging.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search & Select Product</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductResults(true);
                  setSelectedProductId('');
                }}
                onFocus={() => setShowProductResults(true)}
                onBlur={() => setTimeout(() => setShowProductResults(false), 160)}
                placeholder="Search by name, category, barcode and select"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {showProductResults && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {loadingProducts ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Loading products...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onMouseDown={() => handleProductChange(String(product.id))}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-800">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {product.category_name || 'No category'}{product.barcode ? ` | ${product.barcode}` : ' | No barcode'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedProduct && !selectedProduct.barcode && (
              <p className="text-xs text-amber-600 mt-1">
                Selected product has no barcode. An auto barcode has been generated for live preview.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label Text</label>
            <input
              type="text"
              value={barcodeLabel}
              onChange={(e) => setBarcodeLabel(e.target.value)}
              placeholder="Product name or barcode label"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">Price (optional)</label>
          <input
            type="text"
            value={barcodePrice}
            onChange={(e) => setBarcodePrice(e.target.value)}
            placeholder="e.g. 500"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">Barcode Value</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder="Enter value (e.g. 8901234567890)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleAutoRegenerate}
              className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 inline-flex items-center gap-2"
              title="Auto generate/re-generate barcode"
            >
              <Wand2 className="w-4 h-4" />
              Auto
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Display Filters & Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoGenerateMode}
                onChange={(e) => setAutoGenerateMode(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Auto generate when selected product has no barcode
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showTextOnBarcode}
                onChange={(e) => setShowTextOnBarcode(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show text under barcode
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showNameInText}
                onChange={(e) => setShowNameInText(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={!showTextOnBarcode}
              />
              Show product/name text
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showBarcodeInText}
                onChange={(e) => setShowBarcodeInText(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={!showTextOnBarcode}
              />
              Show barcode number
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPriceInText}
                onChange={(e) => setShowPriceInText(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={!showTextOnBarcode}
              />
              Show price
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bar Width</label>
              <input
                type="number"
                min="1"
                max="4"
                step="1"
                value={barcodeWidth}
                onChange={(e) => setBarcodeWidth(Math.max(1, Math.min(4, Number(e.target.value) || 2)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bar Height</label>
              <input
                type="number"
                min="40"
                max="180"
                step="2"
                value={barcodeHeight}
                onChange={(e) => setBarcodeHeight(Math.max(40, Math.min(180, Number(e.target.value) || 80)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Margin</label>
              <input
                type="number"
                min="0"
                max="24"
                step="1"
                value={barcodeMargin}
                onChange={(e) => setBarcodeMargin(Math.max(0, Math.min(24, Number(e.target.value) || 10)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-2xl">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Preview</h2>
        <div className="min-h-[180px] border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center p-4">
          {barcodeValue.trim() ? (
            <div className="w-full flex flex-col items-center">
              <svg ref={svgRef} className="max-w-full" />
              {getDisplayLines().length > 0 && (
                <div className="mt-2 text-center text-xs text-gray-700 leading-5">
                  {getDisplayLines().map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Enter a barcode value to see preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
