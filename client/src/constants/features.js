/**
 * Feature keys match route paths (without leading slash).
 * Default features are included when a new tenant is created.
 * All other features are "premium" and require enabling for the tenant.
 */
export const DEFAULT_FEATURES = [
  'dashboard',
  'billing',
  'inventory',
  'sales-history',
  'reports',
  'settings'
];

export const ALL_FEATURE_KEYS = [
  'dashboard',
  'billing',
  'inventory',
  'unit-conversions',
  'sales-history',
  'deliveries',
  'delivery-boys',
  'employees',
  'suppliers',
  'purchase-orders',
  'expenses',
  'cash',
  'reports',
  'users',
  'settings'
];

/** Path (with leading slash) to feature key */
export function pathToFeatureKey(path) {
  if (!path || typeof path !== 'string') return null;
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = p.split('/')[0] || '';
  return base || null;
}

export function isFeatureAllowed(featureKey, allowedFeatures) {
  if (!featureKey) return true;
  if (!allowedFeatures || !Array.isArray(allowedFeatures)) return false;
  return allowedFeatures.includes(featureKey);
}

export function isDefaultFeature(featureKey) {
  return DEFAULT_FEATURES.includes(featureKey);
}

/** Premium = not in default set; can be toggled per tenant */
export const PREMIUM_FEATURE_KEYS = ALL_FEATURE_KEYS.filter((k) => !DEFAULT_FEATURES.includes(k));

/** Human-readable labels for feature keys (for admin UI) */
export const FEATURE_LABELS = {
  'dashboard': 'Dashboard',
  'billing': 'Billing',
  'inventory': 'Inventory',
  'unit-conversions': 'Unit Conversion',
  'sales-history': 'Sales History',
  'deliveries': 'Deliveries',
  'delivery-boys': 'Delivery Boys',
  'employees': 'Employees & Salaries',
  'suppliers': 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  'expenses': 'Expenses',
  'cash': 'Cash',
  'reports': 'Reports',
  'users': 'Users',
  'settings': 'Settings'
};
