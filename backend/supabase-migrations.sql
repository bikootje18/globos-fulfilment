-- Expand orders.status to include 'split'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'split'));

-- products: routing and weight columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams integer DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS column_position integer DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS column_side text DEFAULT NULL
  CHECK (column_side IN ('N', 'Z'));

-- orders: test flag and packing metadata
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_grams integer DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_box_count integer DEFAULT NULL;

-- order_items: out-of-stock tracking
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS out_of_stock_quantity integer NOT NULL DEFAULT 0;

-- scan_log: richer audit trail
ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS time_since_previous_event_ms integer DEFAULT NULL;
ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'scan';

-- sub_orders: split order parts
CREATE TABLE IF NOT EXISTS sub_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL DEFAULT 1,
  assigned_operator text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT NULL
);

-- sub_order_items: which order_items belong to each sub-order
CREATE TABLE IF NOT EXISTS sub_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE
);

-- boxes: pre-calculated box plan per order (or sub-order)
CREATE TABLE IF NOT EXISTS boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  sequence_number integer NOT NULL,
  weight_grams integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- box_items: which order_items (and how many) go in each box
CREATE TABLE IF NOT EXISTS box_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES boxes(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1
);

-- events: generic event log for analytics
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  operator text DEFAULT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- settings: configurable thresholds
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('split_threshold',           '50'),
  ('box_target_weight_grams',   '28000'),
  ('box_max_weight_grams',      '29000')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE sub_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
