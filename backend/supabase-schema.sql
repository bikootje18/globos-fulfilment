-- Run this in your Supabase SQL editor to set up the database

-- Products table
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text unique not null,
  sku text unique,
  location text,         -- warehouse location, e.g. "A-03-2"
  stock integer default 0,
  created_at timestamptz default now()
);

-- Orders table
create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,   -- your webshop order number
  customer_name text,
  status text default 'pending'     -- pending | in_progress | completed
    check (status in ('pending', 'in_progress', 'completed')),
  locked_by text,                   -- operator name currently working this order
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Order items (the pick list)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null default 1,
  scanned_quantity integer not null default 0,
  created_at timestamptz default now()
);

-- Scan log (full audit trail of every scan)
create table scan_log (
  id uuid primary key default gen_random_uuid(),
  barcode text not null,
  product_id uuid references products(id),
  order_id uuid references orders(id),
  operator text not null,
  mode text not null check (mode in ('incoming', 'outgoing')),
  scanned_at timestamptz default now()
);

-- Enable realtime on orders and order_items
-- (so all tablets update instantly when something changes)
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- Sample data to test with
insert into products (name, barcode, sku, location, stock) values
  ('Blue T-shirt (M)',    '8710000000001', 'TS-BLU-M',  'A-01-1', 50),
  ('Black Hoodie (L)',    '8710000000002', 'HD-BLK-L',  'A-02-3', 30),
  ('White Sneakers (42)', '8710000000003', 'SN-WHT-42', 'B-05-1', 20),
  ('Grey Cap',            '8710000000004', 'CP-GRY-OS', 'A-03-2', 75);

insert into orders (reference, customer_name, status) values
  ('ORD-1042', 'Janssen, M.', 'pending'),
  ('ORD-1043', 'De Vries, R.', 'pending');

insert into order_items (order_id, product_id, quantity)
select o.id, p.id, 1
from orders o, products p
where o.reference = 'ORD-1042' and p.sku in ('TS-BLU-M', 'HD-BLK-L', 'SN-WHT-42');

insert into order_items (order_id, product_id, quantity)
select o.id, p.id, 2
from orders o, products p
where o.reference = 'ORD-1042' and p.sku = 'CP-GRY-OS';

insert into order_items (order_id, product_id, quantity)
select o.id, p.id, 1
from orders o, products p
where o.reference = 'ORD-1043' and p.sku in ('TS-BLU-M', 'HD-BLK-L');
