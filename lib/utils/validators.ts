import { z } from 'zod';

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d+$/, 'OTP must contain only digits');

export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  full_address: z.string().min(10, 'Enter a complete address'),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  latitude: z.number(),
  longitude: z.number(),
  is_default: z.boolean().default(false),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  category_id: z.string().uuid('Select a category'),
  unit: z.string().min(1, 'Unit is required'),
  mrp: z.number().positive('MRP must be greater than 0'),
  selling_price: z.number().positive('Selling price must be greater than 0'),
  offer_percentage: z.number().min(0).max(100).default(0),
  tax_percentage: z.number().min(0).max(100).default(0),
  stock_quantity: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).default(10),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const merchantSchema = z.object({
  store_name: z.string().min(2, 'Store name is required'),
  description: z.string().optional(),
  category_id: z.string().uuid('Select a category').optional(),
  phone: phoneSchema,
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().min(10, 'Enter a complete address'),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  latitude: z.number(),
  longitude: z.number(),
  avg_delivery_time: z.number().int().min(10).max(120).default(30),
  min_order_amount: z.number().min(0).default(0),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type MerchantFormData = z.infer<typeof merchantSchema>;
