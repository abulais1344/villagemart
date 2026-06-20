export interface Customer {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  area: string;
}

export function getCustomer(): Customer | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('vm_customer');
  return data ? JSON.parse(data) : null;
}

export function isLoggedIn(): boolean {
  return !!getCustomer();
}
