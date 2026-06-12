import { asaasFetch } from "./client";

export type AsaasCustomer = {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
};

export async function createAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
}) {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      phone: input.phone,
      postalCode: input.postalCode?.replace(/\D/g, ""),
      address: input.address,
      addressNumber: input.addressNumber,
      province: input.city,
      city: input.city,
      state: input.state
    })
  });
}

export async function updateAsaasCustomer(
  customerId: string,
  input: Partial<{
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    city: string;
    state: string;
  }>
) {
  return asaasFetch<AsaasCustomer>(`/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...input,
      cpfCnpj: input.cpfCnpj?.replace(/\D/g, ""),
      postalCode: input.postalCode?.replace(/\D/g, "")
    })
  });
}
