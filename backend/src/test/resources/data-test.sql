INSERT INTO expense_categories (name, type, icon_code) VALUES
  ('Food & Dining',   'WANT',       '🍽️'),
  ('Housing',         'NEED',       '🏠'),
  ('Utilities',       'NEED',       '⚡'),
  ('Transport',       'NEED',       '🚌'),
  ('Medical',         'NEED',       '💊'),
  ('Entertainment',   'WANT',       '🎮'),
  ('Shopping',        'WANT',       '🛍️'),
  ('Investment',      'INVESTMENT', '📈'),
  ('Education',       'NEED',       '📚'),
  ('Loan Repayment',  'NEED',       '💳'),
  ('Grocery',         'NEED',       '🛒'),
  ('Other',           'WANT',       '📦');

INSERT INTO classification_keywords (keyword, category_id, is_subscription_hint, priority) VALUES
  ('zomato',        1, FALSE, 10), ('swiggy',        1, FALSE, 10),
  ('netflix',       6, TRUE,  10), ('spotify',       6, TRUE,  10);
