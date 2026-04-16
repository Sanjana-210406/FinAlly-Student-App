-- ============================================================
-- FinAlly Student Finance App — MySQL Database Schema
-- MySQL 8.x   |   Database: finally_student
-- ============================================================

CREATE DATABASE IF NOT EXISTS finally_student
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE finally_student;

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL COMMENT 'BCrypt hashed — never plain text',
  profile_type ENUM('STUDENT') NOT NULL DEFAULT 'STUDENT',
  gender       ENUM('MALE','FEMALE','OTHER') NOT NULL DEFAULT 'OTHER',
  age          TINYINT      NOT NULL DEFAULT 20,
  college      VARCHAR(200),
  study_year   VARCHAR(10),
  created_at   DATETIME     NOT NULL DEFAULT NOW()
);

-- ── income_sources ─────────────────────────────────────────────
CREATE TABLE income_sources (
  id           BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT        NOT NULL,
  source_name  VARCHAR(100)  NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  frequency    ENUM('MONTHLY','QUARTERLY','YEARLY') NOT NULL DEFAULT 'MONTHLY',
  income_type  ENUM('POCKET_MONEY','PART_TIME','SCHOLARSHIP','OTHER') NOT NULL DEFAULT 'POCKET_MONEY',
  created_at   DATETIME      NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_income_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── budgets ────────────────────────────────────────────────────
CREATE TABLE budgets (
  id                     BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id                BIGINT        NOT NULL,
  month                  TINYINT       NOT NULL COMMENT '1–12',
  year                   SMALLINT      NOT NULL,
  total_income           DECIMAL(12,2) NOT NULL,
  savings_target         DECIMAL(12,2) NOT NULL COMMENT '10% locked first',
  needs_allocation       DECIMAL(12,2) NOT NULL COMMENT '50%',
  wants_allocation       DECIMAL(12,2) NOT NULL COMMENT '30%',
  emergency_buffer       DECIMAL(12,2) NOT NULL COMMENT '10%',
  dynamic_monthly_target DECIMAL(12,2)           COMMENT 'Recalibrated for yearly goal',
  created_at             DATETIME      NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_budget_user_month (user_id, month, year),
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── expense_categories ─────────────────────────────────────────
CREATE TABLE expense_categories (
  id        BIGINT       PRIMARY KEY AUTO_INCREMENT,
  name      VARCHAR(100) NOT NULL UNIQUE,
  type      ENUM('NEED','WANT','INVESTMENT') NOT NULL,
  icon_code VARCHAR(50)
);

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

-- ── expenses ───────────────────────────────────────────────────
CREATE TABLE expenses (
  id                      BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id                 BIGINT        NOT NULL,
  budget_id               BIGINT        NOT NULL,
  category_id             BIGINT        NOT NULL,
  amount                  DECIMAL(10,2) NOT NULL,
  description             VARCHAR(255)  NOT NULL,
  date                    DATE          NOT NULL,
  fingerprint             VARCHAR(64)   NOT NULL COMMENT 'SHA-256 duplicate detection hash',
  is_anomaly              BOOLEAN       NOT NULL DEFAULT FALSE,
  is_subscription         BOOLEAN       NOT NULL DEFAULT FALSE,
  is_emotional_spend      BOOLEAN       NOT NULL DEFAULT FALSE,
  user_corrected_category BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at              DATETIME      NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_fingerprint_user (user_id, fingerprint),
  CONSTRAINT fk_exp_user     FOREIGN KEY (user_id)     REFERENCES users(id)               ON DELETE CASCADE,
  CONSTRAINT fk_exp_budget   FOREIGN KEY (budget_id)   REFERENCES budgets(id)             ON DELETE CASCADE,
  CONSTRAINT fk_exp_category FOREIGN KEY (category_id) REFERENCES expense_categories(id)  ON DELETE RESTRICT,
  INDEX idx_exp_user_date (user_id, date)
);

-- ── classification_keywords ────────────────────────────────────
CREATE TABLE classification_keywords (
  id                   BIGINT       PRIMARY KEY AUTO_INCREMENT,
  keyword              VARCHAR(100) NOT NULL,
  category_id          BIGINT       NOT NULL,
  is_subscription_hint BOOLEAN      NOT NULL DEFAULT FALSE,
  priority             INT          NOT NULL DEFAULT 1,
  CONSTRAINT fk_kw_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE
);

INSERT INTO classification_keywords (keyword, category_id, is_subscription_hint, priority) VALUES
  ('zomato',        1, FALSE, 10), ('swiggy',        1, FALSE, 10),
  ('restaurant',    1, FALSE,  8), ('cafe',          1, FALSE,  8),
  ('lunch',         1, FALSE,  6), ('dinner',        1, FALSE,  6),
  ('breakfast',     1, FALSE,  6), ('chai',          1, FALSE,  5),
  ('rent',          2, FALSE, 10), ('pg',            2, FALSE, 10),
  ('hostel',        2, FALSE,  9),
  ('electricity',   3, FALSE, 10), ('wifi',          3, FALSE, 10),
  ('water bill',    3, FALSE, 10), ('broadband',     3, FALSE, 10),
  ('metro',         4, FALSE, 10), ('uber',          4, FALSE, 10),
  ('ola',           4, FALSE, 10), ('rapido',        4, FALSE, 10),
  ('petrol',        4, FALSE, 10), ('bus',           4, FALSE,  8),
  ('medicine',      5, FALSE, 10), ('hospital',      5, FALSE, 10),
  ('pharmacy',      5, FALSE, 10), ('doctor',        5, FALSE, 10),
  ('netflix',       6, TRUE,  10), ('spotify',       6, TRUE,  10),
  ('hotstar',       6, TRUE,  10), ('prime',         6, TRUE,   9),
  ('disney',        6, TRUE,  10), ('youtube premium',6,TRUE,  10),
  ('discord nitro', 6, TRUE,   9), ('notion',        6, TRUE,   8),
  ('canva',         6, TRUE,   8), ('adobe',         6, TRUE,  10),
  ('amazon',        7, FALSE,  8), ('flipkart',      7, FALSE,  8),
  ('myntra',        7, FALSE,  9), ('meesho',        7, FALSE,  8),
  ('sip',           8, FALSE, 10), ('mutual fund',   8, FALSE, 10),
  ('ppf',           8, FALSE, 10), ('rd',            8, FALSE,  7),
  ('fd',            8, FALSE,  7), ('nps',           8, FALSE, 10),
  ('book',          9, FALSE,  7), ('course',        9, FALSE,  8),
  ('udemy',         9, TRUE,   9), ('coursera',      9, TRUE,   9),
  ('fees',          9, FALSE,  9), ('college',       9, FALSE,  8),
  ('stationery',    9, FALSE,  7),
  ('emi',          10, FALSE, 10), ('loan',         10, FALSE,  9),
  ('grocery',      11, FALSE,  9), ('dmart',        11, FALSE, 10),
  ('bigbasket',    11, FALSE, 10), ('blinkit',      11, FALSE, 10),
  ('zepto',        11, FALSE, 10), ('reliance fresh',11,FALSE, 10);

-- ── merchant_learned_mappings ──────────────────────────────────
CREATE TABLE merchant_learned_mappings (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT       NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  category_id   BIGINT       NOT NULL,
  times_used    INT          NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_merchant_user (user_id, merchant_name),
  CONSTRAINT fk_mlm_user     FOREIGN KEY (user_id)     REFERENCES users(id)              ON DELETE CASCADE,
  CONSTRAINT fk_mlm_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT
);

-- ── savings_goals ──────────────────────────────────────────────
CREATE TABLE savings_goals (
  id                 BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id            BIGINT        NOT NULL,
  goal_name          VARCHAR(150)  NOT NULL,
  target_amount      DECIMAL(12,2) NOT NULL,
  saved_so_far       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monthly_required   DECIMAL(12,2) NOT NULL,
  deadline           DATE,
  is_emergency_fund  BOOLEAN       NOT NULL DEFAULT FALSE,
  is_yearly_target   BOOLEAN       NOT NULL DEFAULT FALSE,
  is_completed       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at         DATETIME      NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── subscriptions ──────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id           BIGINT        NOT NULL,
  merchant_name     VARCHAR(255)  NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  frequency         ENUM('WEEKLY','MONTHLY','ANNUAL') NOT NULL DEFAULT 'MONTHLY',
  last_charged_date DATE          NOT NULL,
  status            ENUM('ACTIVE','POSSIBLY_CANCELLED','CONFIRMED_CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  user_confirmed    BOOLEAN       NOT NULL DEFAULT FALSE,
  detected_at       DATETIME      NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── behavioral_patterns ───────────────────────────────────────
CREATE TABLE behavioral_patterns (
  id           BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT        NOT NULL,
  pattern_type ENUM('DAY_SPIKE','MONTH_END','MERCHANT_HABIT','CATEGORY_CREEP','IMPULSE_CLUSTER','SEASONAL') NOT NULL,
  description  VARCHAR(500)  NOT NULL,
  detected_at  DATETIME      NOT NULL DEFAULT NOW(),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_bp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bp_user (user_id)
);

-- ── alerts ────────────────────────────────────────────────────
CREATE TABLE alerts (
  id          BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT        NOT NULL,
  message     VARCHAR(500)  NOT NULL,
  alert_type  ENUM('WARNING','DANGER','SAVINGS_RISK','GOAL_DEADLINE','ANOMALY','PREDICTIVE',
                   'SUBSCRIPTION_LEAK','EMOTIONAL_SPEND','BEHAVIORAL_BOT') NOT NULL,
  category_id BIGINT,
  is_read     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  DATETIME      NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_alert_user     FOREIGN KEY (user_id)     REFERENCES users(id)              ON DELETE CASCADE,
  CONSTRAINT fk_alert_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  INDEX idx_alert_user_read (user_id, is_read)
);

-- ── financial_health_scores ───────────────────────────────────
CREATE TABLE financial_health_scores (
  id                          BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id                     BIGINT        NOT NULL,
  score                       DECIMAL(5,2)  NOT NULL,
  savings_component           DECIMAL(5,2)  NOT NULL,
  adherence_component         DECIMAL(5,2)  NOT NULL,
  goal_component              DECIMAL(5,2)  NOT NULL,
  emergency_fund_component    DECIMAL(5,2)  NOT NULL,
  behavior_component          DECIMAL(5,2)  NOT NULL,
  calculated_at               DATETIME      NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_score_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_score_user (user_id)
);

-- ── gamification ──────────────────────────────────────────────
CREATE TABLE gamification (
  id           BIGINT        PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT        NOT NULL,
  streak_type  ENUM('LOGGING','UNDER_BUDGET','SAVINGS_HIT','NO_EMOTIONAL_SPEND'),
  streak_count INT           NOT NULL DEFAULT 0,
  badge_code   VARCHAR(100),
  awarded_at   DATETIME,
  updated_at   DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  CONSTRAINT fk_gami_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Demo seed user (password = Demo@1234, BCrypt hashed) ──────
INSERT INTO users (name, email, password, profile_type, gender, age, college, study_year)
VALUES (
  'Demo Student',
  'demo@student.finally',
  '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lR',
  'STUDENT', 'OTHER', 20, 'Demo College', '2'
);
