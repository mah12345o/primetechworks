export interface ClientData {
  id: string;
  name: string;
  city: string;
  email: string;
  mobile: string;
  amount: number;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  data?: ClientData;
}
