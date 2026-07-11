export type UserRole = 'customer' | 'merchant' | 'rider' | 'admin';
export type OrderStatus = 'pending' | 'accepted' | 'packed' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type DeliveryType = 'own_store' | 'marketplace';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  landmark: string | null;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  icon_url: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string | null;
  category_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  mrp: number;
  selling_price: number;
  discount_price: number | null;
  offer_percentage: number;
  tax_percentage: number;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: StockStatus;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_veg: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  merchant?: Merchant;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  merchant_id: string | null;
  delivery_type: DeliveryType;
  status: OrderStatus;
  address_id: string;
  delivery_address: Address | { name?: string; phone?: string; address?: string; landmark?: string; area?: string } | null;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  commission_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  notes: string | null;
  accepted_at: string | null;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  merchant?: Merchant;
  customer?: User;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_snapshot: Partial<Product>;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Merchant {
  id: string;
  user_id: string;
  store_name: string;
  description: string | null;
  category_id: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  logo_url: string | null;
  banner_url: string | null;
  status: MerchantStatus;
  commission_rate: number;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
  admin_override?: boolean | null;
  avg_delivery_time: number;
  min_order_amount: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  user?: User;
}

export interface MerchantDocument {
  id: string;
  merchant_id: string;
  document_type: string;
  document_url: string;
  is_verified: boolean;
  created_at: string;
}

export interface Rider {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  license_url: string | null;
  aadhar_url: string | null;
  is_available: boolean;
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string;
  user?: User;
}

export interface Delivery {
  id: string;
  order_id: string;
  rider_id: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_km: number | null;
  proof_photo_url: string | null;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  rider?: Rider;
  order?: Order;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  type: 'global' | 'category' | 'merchant';
  reference_id: string | null;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryCharge {
  id: string;
  min_km: number;
  max_km: number;
  charge: number;
  free_delivery_above: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  type: 'flash_sale' | 'category_discount' | 'product_discount' | 'store_discount';
  reference_id: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

// Razorpay types
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Analytics types
export interface MerchantStats {
  total_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  total_products: number;
  low_stock_products: number;
}

export interface AdminStats {
  total_users: number;
  total_merchants: number;
  total_riders: number;
  total_orders: number;
  total_revenue: number;
  commission_earned: number;
  pending_orders: number;
  today_orders: number;
}
