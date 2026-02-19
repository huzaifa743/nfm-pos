import { useState, useEffect } from 'react';
import api from '../api/api';
import { X } from 'lucide-react';

export default function UnitSelectionModal({ open, onClose, product, onConfirm }) {
  const [unitConversions, setUnitConversions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      fetchUnitConversions();
      // Set default unit to product's sale unit or base unit
      const defaultUnit = product.product_sale_unit || product.product_base_unit || '';
      setSelectedUnit(defaultUnit);
      setQuantity(1);
    }
  }, [open, product]);

  const fetchUnitConversions = async () => {
    try {
      const response = await api.get('/unit-conversions');
      setUnitConversions(response.data);
      buildAvailableUnits(response.data);
    } catch (error) {
      console.error('Error fetching unit conversions:', error);
    }
  };

  const buildAvailableUnits = (conversions) => {
    if (!product?.product_base_unit) {
      setAvailableUnits([]);
      return;
    }

    const units = [product.product_base_unit]; // Always include base unit
    // Add conversion names that use this base unit
    conversions
      .filter(c => c.base_unit === product.product_base_unit)
      .forEach(c => units.push(c.name));
    
    setAvailableUnits([...new Set(units)].sort());
    
    // Set default unit if not already set
    if (!selectedUnit && units.length > 0) {
      const defaultUnit = product.product_sale_unit || product.product_base_unit || units[0];
      setSelectedUnit(defaultUnit);
    }
  };

  const convertToBaseUnit = (unit, qty) => {
    if (!unit || !product?.product_base_unit) return qty;
    
    // If unit is base unit, return as is
    if (unit === product.product_base_unit) return qty;
    
    // Find conversion for this unit
    const conversion = unitConversions.find(c => c.name === unit && c.base_unit === product.product_base_unit);
    if (!conversion) return qty;
    
    // Convert to base unit
    if (conversion.operator === '*') {
      return qty * conversion.operation_value;
    } else {
      return qty / conversion.operation_value;
    }
  };

  const convertFromBaseUnit = (baseQty, targetUnit) => {
    if (!targetUnit || !product?.product_base_unit) return baseQty;
    
    // If target unit is base unit, return as is
    if (targetUnit === product.product_base_unit) return baseQty;
    
    // Find conversion for target unit
    const conversion = unitConversions.find(c => c.name === targetUnit && c.base_unit === product.product_base_unit);
    if (!conversion) return baseQty;
    
    // Convert from base unit
    if (conversion.operator === '*') {
      return baseQty / conversion.operation_value;
    } else {
      return baseQty * conversion.operation_value;
    }
  };

  const handleUnitChange = (newUnit) => {
    // When unit changes, keep quantity at 1 (or current value) - don't auto-convert
    setSelectedUnit(newUnit);
    // Quantity remains unchanged - user can manually change it if needed
  };

  const handleQuantityChange = (newQty) => {
    setQuantity(parseFloat(newQty) || 0);
  };

  const handleConfirm = () => {
    if (!selectedUnit || quantity <= 0) {
      return;
    }

    // Convert to base unit for calculation
    const baseQty = convertToBaseUnit(selectedUnit, quantity);
    
    // Calculate price based on base unit quantity
    const basePrice = parseFloat(product.price) || 0; // Price in inventory is base price
    const vatPct = parseFloat(product.vat_percentage) || 0;
    
    let unitPrice, baseUnitPrice, vatAmount, finalTotal;
    if (vatPct > 0) {
      // Price in inventory is base price, calculate inclusive price for display
      baseUnitPrice = basePrice;
      unitPrice = basePrice * (1 + vatPct / 100); // Inclusive price = base * (1 + VAT%)
      const lineBase = baseUnitPrice * baseQty;
      const inclusiveTotal = unitPrice * baseQty;
      vatAmount = inclusiveTotal - lineBase;
      finalTotal = inclusiveTotal;
    } else {
      // No VAT
      baseUnitPrice = basePrice;
      unitPrice = basePrice;
      vatAmount = 0;
      finalTotal = basePrice * baseQty;
    }

    onConfirm({
      ...product,
      selected_unit: selectedUnit,
      quantity: baseQty, // Store quantity in base unit
      display_quantity: quantity, // Display quantity in selected unit
      unit_price: unitPrice, // Inclusive price for display
      base_unit_price: baseUnitPrice, // Base price for calculations
      total_price: parseFloat(finalTotal.toFixed(2)),
      vat_amount: vatAmount,
    });
    
    onClose();
  };

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Select Unit & Quantity</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Product: {product.name}</p>
            <p className="text-xs text-gray-500">Base Unit: {product.product_base_unit || 'N/A'}</p>
          </div>

          {availableUnits.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Unit *
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Unit</option>
                  {availableUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter quantity"
                />
                {selectedUnit && (
                  <p className="text-xs text-gray-500 mt-1">
                    {quantity} {selectedUnit} = {convertToBaseUnit(selectedUnit, quantity).toFixed(4)} {product.product_base_unit || 'base unit'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {product.product_base_unit 
                ? 'No unit conversions available. Please add unit conversions first.'
                : 'Product base unit not set. Please set base unit in product settings.'}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedUnit || quantity <= 0 || availableUnits.length === 0}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
