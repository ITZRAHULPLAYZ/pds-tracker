-- ============================================================
--  PDS Tracker — Database Schema & Seed Data
--  Run: mysql -u root -p < schema.sql
-- ============================================================

DROP DATABASE IF EXISTS pds_tracker;
CREATE DATABASE pds_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pds_tracker;

-- Users (all roles)
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(100)  UNIQUE NOT NULL,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('beneficiary', 'shop_owner', 'admin') DEFAULT 'beneficiary',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fair Price Shops
CREATE TABLE shops (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  owner_id    INT,
  address     TEXT,
  license_no  VARCHAR(50),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Beneficiary ration card details
CREATE TABLE beneficiaries (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  ration_card_no  VARCHAR(20) UNIQUE NOT NULL,
  family_size     INT DEFAULT 1,
  category        ENUM('APL', 'BPL', 'AAY') DEFAULT 'BPL',
  address         TEXT,
  phone           VARCHAR(15),
  aadhar          VARCHAR(12),
  shop_id         INT DEFAULT 1,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (shop_id)  REFERENCES shops(id)
);

-- Monthly entitlements per beneficiary
CREATE TABLE entitlements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  beneficiary_id  INT NOT NULL,
  month           VARCHAR(7) NOT NULL,       -- YYYY-MM
  rice_kg         DECIMAL(5,2) DEFAULT 0,
  wheat_kg        DECIMAL(5,2) DEFAULT 0,
  sugar_kg        DECIMAL(5,2) DEFAULT 0,
  oil_liters      DECIMAL(5,2) DEFAULT 0,
  collected       BOOLEAN DEFAULT FALSE,
  collected_at    TIMESTAMP NULL,
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id)
);

-- QR-verified transactions
CREATE TABLE transactions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  beneficiary_id   INT NOT NULL,
  shop_id          INT NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  items            JSON,
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
  FOREIGN KEY (shop_id)        REFERENCES shops(id)
);

-- Stock levels per shop
CREATE TABLE stock (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  shop_id     INT NOT NULL,
  commodity   VARCHAR(50) NOT NULL,
  quantity    DECIMAL(8,2) DEFAULT 0,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_commodity (shop_id, commodity),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

-- Grievances / complaints
CREATE TABLE grievances (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  beneficiary_id  INT,
  subject         VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  status          ENUM('pending', 'in_progress', 'resolved') DEFAULT 'pending',
  submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at     TIMESTAMP NULL,
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id)
);

-- ============================================================
--  Seed Data
--  All demo passwords = "admin123"
--  Hash generated with bcryptjs rounds=10
-- ============================================================

INSERT INTO users (name, email, password, role) VALUES
  ('Admin User',      'admin@pds.gov.in',  '$2a$10$Opcz/gJN88cqOoS3aHTytex/R67jnCWFGbGcFfE9sMdtcwKBQw1Qe', 'admin'),
  ('Ravi Shop Owner', 'ravi@fps.in',       '$2a$10$Opcz/gJN88cqOoS3aHTytex/R67jnCWFGbGcFfE9sMdtcwKBQw1Qe', 'shop_owner'),
  ('Priya Sharma',    'priya@gmail.com',   '$2a$10$Opcz/gJN88cqOoS3aHTytex/R67jnCWFGbGcFfE9sMdtcwKBQw1Qe', 'beneficiary'),
  ('Mohan Kumar',     'mohan@gmail.com',   '$2a$10$Opcz/gJN88cqOoS3aHTytex/R67jnCWFGbGcFfE9sMdtcwKBQw1Qe', 'beneficiary'),
  ('Lakshmi Devi',    'lakshmi@gmail.com', '$2a$10$Opcz/gJN88cqOoS3aHTytex/R67jnCWFGbGcFfE9sMdtcwKBQw1Qe', 'beneficiary');

INSERT INTO shops (name, owner_id, address, license_no) VALUES
  ('Ravi Fair Price Shop',       2, 'Plot 12, Gandhi Nagar, Hyderabad — 500 001', 'FPS/HYD/001/2024'),
  ('Sri Venkateswara FPS',    NULL, 'H.No 45, Ameerpet, Hyderabad — 500 016',    'FPS/HYD/002/2024');

INSERT INTO beneficiaries (user_id, ration_card_no, family_size, category, address, phone, aadhar, shop_id) VALUES
  (3, 'RC20240001', 4, 'BPL', 'H.No 23, Dilsukhnagar, Hyderabad',         '9876543210', '123456789012', 1),
  (4, 'RC20240002', 3, 'AAY', 'Flat 5B, Kukatpally Housing Board',         '9876543211', '234567890123', 1),
  (5, 'RC20240003', 2, 'APL', '8-2-120, Road No.3, Banjara Hills',         '9876543212', '345678901234', 2);

-- Current month entitlements
INSERT INTO entitlements (beneficiary_id, month, rice_kg, wheat_kg, sugar_kg, oil_liters, collected) VALUES
  (1, '2026-09', 12.00, 12.00, 0.50, 0.50, FALSE),
  (2, '2026-09', 17.50, 17.50, 1.00, 1.00, TRUE),
  (3, '2026-09',  7.00,  7.00, 0.25, 0.25, FALSE);

-- Previous month entitlements
INSERT INTO entitlements (beneficiary_id, month, rice_kg, wheat_kg, sugar_kg, oil_liters, collected, collected_at) VALUES
  (1, '2026-08', 12.00, 12.00, 0.50, 0.50, TRUE, '2026-08-12 10:30:00'),
  (2, '2026-08', 17.50, 17.50, 1.00, 1.00, TRUE, '2026-08-08 09:15:00'),
  (3, '2026-08',  7.00,  7.00, 0.25, 0.25, TRUE, '2026-08-15 11:45:00'),
  (1, '2026-07', 12.00, 12.00, 0.50, 0.50, TRUE, '2026-07-10 09:00:00'),
  (2, '2026-07', 17.50, 17.50, 1.00, 1.00, TRUE, '2026-07-11 10:20:00'),
  (3, '2026-07',  7.00,  7.00, 0.25, 0.25, TRUE, '2026-07-09 14:00:00');

INSERT INTO stock (shop_id, commodity, quantity) VALUES
  (1, 'Rice',  450.00),
  (1, 'Wheat', 380.00),
  (1, 'Sugar',  45.00),
  (1, 'Oil',    40.00),
  (2, 'Rice',  320.00),
  (2, 'Wheat', 290.00),
  (2, 'Sugar',  30.00),
  (2, 'Oil',    25.00);

INSERT INTO grievances (beneficiary_id, subject, description, status) VALUES
  (1, 'Rice quality very poor',        'The rice provided last month contained stones and was of very poor quality. Requesting replacement.',                             'pending'),
  (2, 'Short supply of wheat',         'Only 15 kg wheat given instead of the entitled 17.5 kg. Shop owner refused to give remaining quantity.',                       'in_progress'),
  (3, 'Shop closed on distribution day','Shop was closed on the assigned distribution date without any prior notice. Had to return the next day.',                     'resolved');

INSERT INTO transactions (beneficiary_id, shop_id, items) VALUES
  (2, 1, '{"rice_kg": 17.5, "wheat_kg": 17.5, "sugar_kg": 1.0, "oil_liters": 1.0}'),
  (1, 1, '{"rice_kg": 12.0, "wheat_kg": 12.0, "sugar_kg": 0.5, "oil_liters": 0.5}'),
  (3, 2, '{"rice_kg": 7.0,  "wheat_kg": 7.0,  "sugar_kg": 0.25,"oil_liters": 0.25}');
