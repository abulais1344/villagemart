export interface AddressData {
  label: 'Home' | 'Work' | 'Other';
  address: string;
  area: string;
  lat: number | null;
  lng: number | null;
  pincode: string | null;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address: string;
  landmark: string;
  area: string;
  lat?: number;
  lng?: number;
  addresses?: AddressData[];
  active_address_index?: number;
}

export function getCustomer(): Customer | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('vm_customer');
  return data ? JSON.parse(data) : null;
}

export function isLoggedIn(): boolean {
  return !!getCustomer();
}
