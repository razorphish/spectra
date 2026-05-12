export type UserType = {
  id: number
  name: string
  email: string
  phone: string
  status: 'active' | 'disable' | 'pending'
  amount: number
}

export const users: UserType[] = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', phone: '123-456-7890', status: 'active', amount: 100.0 },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    status: 'disable',
    amount: 200.0,
  },
  { id: 3, name: 'Jim Beam', email: 'jim.beam@example.com', phone: '555-123-4567', status: 'active', amount: 300.0 },
  {
    id: 4,
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    phone: '415-555-0101',
    status: 'pending',
    amount: 150.0,
  },
  { id: 5, name: 'Robert Lee', email: 'robert.lee@example.com', phone: '310-987-6543', status: 'active', amount: 75.0 },
  {
    id: 6,
    name: 'Sarah Kim',
    email: 'sarah.kim@example.com',
    phone: '212-345-6789',
    status: 'disable',
    amount: 250.0,
  },
  {
    id: 7,
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '617-890-1234',
    status: 'active',
    amount: 400.0,
  },
  {
    id: 8,
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '720-456-7891',
    status: 'pending',
    amount: 50.0,
  },
  {
    id: 9,
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    phone: '503-234-5678',
    status: 'active',
    amount: 125.0,
  },
  {
    id: 10,
    name: 'Linda Carter',
    email: 'linda.carter@example.com',
    phone: '858-901-2345',
    status: 'disable',
    amount: 175.0,
  },
  {
    id: 11,
    name: 'Thomas Green',
    email: 'thomas.green@example.com',
    phone: '206-789-0123',
    status: 'active',
    amount: 90.0,
  },
  {
    id: 12,
    name: 'Nancy White',
    email: 'nancy.white@example.com',
    phone: '404-567-8901',
    status: 'pending',
    amount: 225.0,
  },
  {
    id: 13,
    name: 'Paul Adams',
    email: 'paul.adams@example.com',
    phone: '713-345-6789',
    status: 'active',
    amount: 350.0,
  },
  {
    id: 14,
    name: 'Clara Evans',
    email: 'clara.evans@example.com',
    phone: '916-123-4567',
    status: 'disable',
    amount: 80.0,
  },
  {
    id: 15,
    name: 'Oliver Harris',
    email: 'oliver.harris@example.com',
    phone: '312-890-1234',
    status: 'active',
    amount: 500.0,
  },
]
