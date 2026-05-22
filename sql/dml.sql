-- =====================================================================
-- AeroNetB Aerospace Supply Chain Management System
-- DML Script: Seed / Dummy Data
-- Module: 5CM506 Data Driven Systems
-- Student ID: 100774690
-- =====================================================================

SET search_path TO aeronetb;

-- =====================================================================
-- SUPPLIERS  (6 global aerospace suppliers)
-- =====================================================================
INSERT INTO supplier (business_name, address_line1, city, country, postal_code, phone, email, website)
VALUES
  ('Titan Aerospace Components Ltd',  '12 Industrial Park, Zone 4',    'Toulouse',      'France',         '31000', '+33-561-001234', 'contact@titan-aero.fr',      'www.titan-aero.fr'),
  ('Precision Alloys GmbH',           'Industriestrasse 88',            'Hamburg',       'Germany',        '20095', '+49-40-567890',  'sales@precision-alloys.de',  'www.precision-alloys.de'),
  ('AeroForge International Inc.',    '5000 Aerospace Blvd',            'Seattle',       'United States',  '98108', '+1-206-555-0190','info@aeroforge.com',          'www.aeroforge.com'),
  ('SkyMetal Fabrication Corp.',      '77 Harbour Rd, Port Industrial', 'Nagoya',        'Japan',          '460-0001','+81-52-200-3000','export@skymetal.co.jp',     'www.skymetal.co.jp'),
  ('CertiComp Aerospace Pvt Ltd',     '45 MIDC Phase II',               'Pune',          'India',          '411018', '+91-20-2671-0000','quotations@certicomp.in',   'www.certicomp.in'),
  ('NordParts AS',                    'Verkstedveien 10',               'Stavanger',     'Norway',         '4021',  '+47-51-700-900', 'orders@nordparts.no',         'www.nordparts.no');

-- =====================================================================
-- ACCREDITATIONS  (ISO/AS/NADCAP certs for suppliers)
-- =====================================================================
INSERT INTO accreditation (supplier_id, accreditation_type, issue_date, expiry_date, status) VALUES
  (1,'ISO 9001',   '2022-03-01','2025-03-01','Active'),
  (1,'AS9100D',    '2022-03-15','2025-03-15','Active'),
  (1,'NADCAP',     '2023-06-01','2026-06-01','Active'),
  (2,'ISO 9001',   '2021-07-01','2024-07-01','Expired'),
  (2,'AS9100D',    '2023-01-10','2026-01-10','Active'),
  (3,'ISO 9001',   '2023-05-01','2026-05-01','Active'),
  (3,'AS9100D',    '2023-05-01','2026-05-01','Active'),
  (3,'FAA Part 21','2022-11-01','2025-11-01','Active'),
  (4,'ISO 9001',   '2022-08-20','2025-08-20','Active'),
  (4,'JIS Q9100',  '2023-02-14','2026-02-14','Active'),
  (5,'ISO 9001',   '2023-09-01','2026-09-01','Active'),
  (5,'DGCA Approval','2023-09-01','2026-09-01','Active'),
  (6,'ISO 9001',   '2022-04-01','2025-04-01','Active'),
  (6,'AS9100D',    '2022-04-01','2025-04-01','Active');

-- =====================================================================
-- PARTS  (8 aerospace components)
-- =====================================================================
INSERT INTO part (part_name, description, category) VALUES
  ('A320 Fuselage Panel Section 13',   'Aluminium-lithium forward fuselage skin panel, frame bays 11-15','fuselage'),
  ('B737 Wing Spar Upper Chord',       'High-strength 7075-T6 aluminium upper wing spar chord assembly', 'wing'),
  ('CFM56 Fan Blade Assembly',         'Titanium alloy first-stage fan blade, 38-blade set',             'engine'),
  ('A380 Cargo Door Hinge Bracket',    'Heavy-duty titanium hinge bracket for aft cargo door',           'fuselage'),
  ('Landing Gear Torque Link Pin',     'Corrosion-resistant steel pin for nose landing gear torque link', 'landing_gear'),
  ('A320 Slat Track Assembly',         'High-lift device slat track and roller guide assembly',          'wing'),
  ('B787 Wing-to-Body Fairing Panel',  'Carbon fibre composite lower wing-to-body fairing section',      'wing'),
  ('Engine Mount Pylon Bracket',       'Forged titanium engine pylon attachment bracket, inboard',       'engine');

-- =====================================================================
-- SUPPLIER_PART  (suppliers linked to parts with pricing)
-- =====================================================================
INSERT INTO supplier_part (supplier_id, part_id, unit_price, lead_time_days) VALUES
  (1,1, 48500.00, 45),  -- Titan → A320 Fuselage Panel
  (3,1, 51200.00, 38),  -- AeroForge → A320 Fuselage Panel
  (2,2, 33750.00, 30),  -- Precision Alloys → B737 Wing Spar
  (4,2, 31400.00, 42),  -- SkyMetal → B737 Wing Spar
  (1,3, 12800.00, 60),  -- Titan → CFM56 Fan Blade
  (3,3, 13200.00, 55),  -- AeroForge → CFM56 Fan Blade
  (4,4,  9600.00, 35),  -- SkyMetal → A380 Cargo Door Hinge
  (2,4,  9100.00, 28),  -- Precision Alloys → A380 Cargo Door Hinge
  (5,5,  1850.00, 21),  -- CertiComp → Landing Gear Pin
  (6,5,  1990.00, 18),  -- NordParts → Landing Gear Pin
  (1,6, 27300.00, 50),  -- Titan → A320 Slat Track
  (5,7, 64000.00, 70),  -- CertiComp → B787 Fairing Panel
  (3,8, 29500.00, 40),  -- AeroForge → Engine Mount Bracket
  (6,8, 28000.00, 35);  -- NordParts → Engine Mount Bracket

-- =====================================================================
-- EMPLOYEES  (one per role + one admin)
-- Password hashes below are bcrypt (cost 10) of 'Password123!'  ($2a$ prefix, compatible with bcryptjs)
-- =====================================================================
INSERT INTO employee (full_name, job_title, department, email, phone, password_hash, access_level, auth_id, is_active)
VALUES
  ('Alexandra Papadaki',   'Senior Procurement Officer', 'Procurement',   'a.papadaki@aeronetb.com',   '+30-210-555-0001',
   '$2a$10$lAMjxM0CstO5x1BSAUFQgO0meQqmMlh/xvRggS/qyC57nMJbRvE8e', 'write', 'auth-001', TRUE),
  ('Dimitris Stavros',     'Quality Inspector II',       'Quality Control','d.stavros@aeronetb.com',    '+30-210-555-0002',
   '$2a$10$5jg2ifk82/Cae9MtbTmOkOePf.DTBcga3zSfLaZmz3VtrUxWrZG6i', 'approve','auth-002', TRUE),
  ('Elena Christodoulou',  'Supply Chain Manager',       'Operations',    'e.christodoulou@aeronetb.com','+30-210-555-0003',
   '$2a$10$uOE0c2F3QITmh9wqV21NyuiX3gVcQb.vHyQ/0QyOHb7FjwNm1ccxa', 'write', 'auth-003', TRUE),
  ('Nikos Angelopoulos',   'Equipment Engineer',         'Engineering',   'n.angelopoulos@aeronetb.com','+30-210-555-0004',
   '$2a$10$.VRxNF34qgU65OBUdldfKucJG8E76QK5RhJHWpzP9Ke5vLqKWRsfi', 'write', 'auth-004', TRUE),
  ('Maria Katsaros',       'Regulatory Auditor',         'Compliance',    'm.katsaros@aeronetb.com',   '+30-210-555-0005',
   '$2a$10$wLQCDoEWGA9cQRwQGJ58H.52BOR0U7SM9B2qaoSHKljAb/2PrOo/W', 'audit', 'auth-005', TRUE),
  ('Kostas Georgiou',      'Junior Procurement Officer', 'Procurement',   'k.georgiou@aeronetb.com',   '+30-210-555-0006',
   '$2a$10$M90J34olvMUYNOwjDzuME.3zuIAEG5Cu5Sn4N633i0YSUZ/bTISda', 'write', 'auth-006', TRUE);

-- =====================================================================
-- ROLES
-- =====================================================================
INSERT INTO role (role_name, description) VALUES
  ('ProcurementOfficer',  'Manages supplier master data and creates/updates purchase orders'),
  ('QualityInspector',    'Creates and manages QC inspection reports; approves certifications'),
  ('SupplyChainManager',  'Oversees shipments and supplier KPIs; read-write operational data'),
  ('EquipmentEngineer',   'Monitors equipment status and IoT sensor streams; schedules maintenance'),
  ('Auditor',             'Read-only access to certifications, audit logs and compliance records');

-- =====================================================================
-- EMPLOYEE_ROLE  (assign roles to employees)
-- =====================================================================
INSERT INTO employee_role (emp_id, role_id) VALUES
  (1,1), -- Alexandra → ProcurementOfficer
  (2,2), -- Dimitris  → QualityInspector
  (3,3), -- Elena     → SupplyChainManager
  (4,4), -- Nikos     → EquipmentEngineer
  (5,5), -- Maria     → Auditor
  (6,1); -- Kostas    → ProcurementOfficer

-- =====================================================================
-- ROLE SUBTYPES
-- =====================================================================
INSERT INTO procurement_officer (emp_id, region_managed, authorization_limit) VALUES
  (1,'Europe & North Africa',   500000.00),
  (6,'Asia Pacific',            250000.00);

INSERT INTO quality_inspector (emp_id, inspector_cert_id, specialization) VALUES
  (2,'EASA-QI-2023-0042','NDT and Dimensional');

INSERT INTO supply_chain_manager (emp_id, assigned_product_line, reporting_level, dashboard_preferences) VALUES
  (3,'A320 Family & B737','Director',
   '{"default_view":"shipments","chart_type":"bar","refresh_seconds":30}'::jsonb);

INSERT INTO equipment_engineer (emp_id, engineering_license, assigned_facility) VALUES
  (4,'GR-EE-2021-9901','Athens Manufacturing Plant');

INSERT INTO auditor (emp_id, regulatory_authority, license_id, audit_scope) VALUES
  (5,'EASA / Hellenic Civil Aviation Authority','HCAA-AUD-2022-0078',
   'Supply chain certifications, QC records, access control compliance');

-- =====================================================================
-- PURCHASE ORDERS
-- =====================================================================
INSERT INTO purchase_order (supplier_id, created_by_emp_id, order_date, desired_delivery_date, actual_delivery_date, status)
VALUES
  (1, 1, '2025-11-01','2026-01-15','2026-01-14','completed'),
  (2, 1, '2025-12-05','2026-02-20', NULL,        'dispatched'),
  (3, 6, '2026-01-10','2026-03-10', NULL,        'confirmed'),
  (4, 6, '2026-02-01','2026-04-01', NULL,        'placed'),
  (5, 1, '2026-02-20','2026-04-30', NULL,        'dispatched'),
  (1, 1, '2026-03-01','2026-05-15', NULL,        'placed'),
  (3, 6, '2026-03-15','2026-06-01', NULL,        'placed');

-- =====================================================================
-- ORDER ITEMS
-- =====================================================================
INSERT INTO order_item (order_id, part_id, quantity, unit_price) VALUES
  (1,1, 4, 48500.00),   -- Completed order: 4 x A320 Fuselage Panels from Titan
  (1,6, 8, 27300.00),   -- + 8 x A320 Slat Tracks from Titan
  (2,2,10, 33750.00),   -- Dispatched: 10 x B737 Wing Spars from Precision Alloys
  (2,4, 6,  9100.00),   -- + 6 x A380 Cargo Door Hinges
  (3,3,38, 13200.00),   -- Confirmed: 38 x CFM56 Fan Blades from AeroForge
  (3,8, 4, 29500.00),   -- + 4 x Engine Mount Brackets
  (4,2, 5, 31400.00),   -- Placed: 5 x B737 Wing Spars from SkyMetal
  (5,5,20,  1850.00),   -- Dispatched: 20 x Landing Gear Pins from CertiComp
  (6,1, 2, 48500.00),   -- Placed: 2 x A320 Fuselage Panels
  (7,7, 3, 64000.00);   -- Placed: 3 x B787 Fairing Panels

-- =====================================================================
-- SHIPMENTS
-- =====================================================================
INSERT INTO shipment (order_id, tracking_number, carrier, port_of_entry, ship_date, estimated_arrival)
VALUES
  (1, 'TLS-2025-110045', 'Geodis Aerospace Logistics', 'Athens International Airport', '2025-12-10','2026-01-14'),
  (2, 'HH-2026-00312',  'DB Schenker',                 'Piraeus Container Terminal',   '2026-01-08','2026-02-22'),
  (5, 'MUM-2026-00890', 'Kuehne+Nagel',                'Piraeus Container Terminal',   '2026-03-05','2026-04-28');

-- =====================================================================
-- EQUIPMENT  (manufacturing machines and tracked containers)
-- =====================================================================
INSERT INTO equipment (equipment_name, equipment_type, facility, installation_date, status) VALUES
  ('CNC Milling Centre #1',          'CNC Machine',    'Athens Manufacturing Plant',   '2019-03-15','Operational'),
  ('CNC Milling Centre #2',          'CNC Machine',    'Athens Manufacturing Plant',   '2020-07-01','Operational'),
  ('Hydraulic Press 400T',           'Press',          'Athens Manufacturing Plant',   '2018-05-22','Maintenance'),
  ('Industrial Heat Treatment Oven', 'Oven',           'Athens Manufacturing Plant',   '2021-11-10','Operational'),
  ('NDT Ultrasonic Scanner Unit A',  'NDT Equipment',  'QC Laboratory',                '2022-04-01','Operational'),
  ('Refrigerated Shipping Container #RC-007','Container','Transit – Europe', '2023-06-15','Operational'),
  ('Refrigerated Shipping Container #RC-012','Container','Transit – Asia',   '2023-06-15','Operational'),
  ('Surface Grinding Machine #3',    'Grinding Machine','Athens Manufacturing Plant',  '2020-01-08','Operational');

-- =====================================================================
-- AUDIT LOG  (representative entries)
-- =====================================================================
INSERT INTO audit_log (emp_id, action_type, entity_type, entity_id, timestamp, details) VALUES
  (1,'create','purchase_order','1','2025-11-01 09:14:00',
   '{"ip":"10.1.1.5","note":"Initial order placement for Titan batch Q4-2025"}'::jsonb),
  (1,'create','purchase_order','2','2025-12-05 11:30:00',
   '{"ip":"10.1.1.5","note":"Precision Alloys B737 wing spar reorder"}'::jsonb),
  (2,'create','qc_reports','RPT-2026-001','2026-01-15 14:00:00',
   '{"ip":"10.1.2.8","note":"Post-delivery dimensional inspection, Order 1"}'::jsonb),
  (2,'approve','qc_reports','RPT-2026-001','2026-01-16 09:00:00',
   '{"ip":"10.1.2.8","note":"Approved — all dimensional checks within tolerance"}'::jsonb),
  (5,'view','accreditation','4','2026-02-10 10:05:00',
   '{"ip":"10.1.3.22","note":"Annual compliance review — Precision Alloys expired cert"}'::jsonb),
  (3,'view','purchase_order','2','2026-01-09 08:00:00',
   '{"ip":"10.1.1.17","note":"Shipment monitoring check"}'::jsonb),
  (4,'view','equipment','3','2026-03-01 07:45:00',
   '{"ip":"10.1.4.3","note":"Pre-maintenance IoT review"}'::jsonb),
  (1,'create','purchase_order','5','2026-02-20 13:00:00',
   '{"ip":"10.1.1.5","note":"CertiComp landing gear pin order"}'::jsonb);
