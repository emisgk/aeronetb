-- =====================================================================
-- AeroNetB Aerospace Supply Chain Management System
-- DDL Script: Schema & Table Creation
-- Module: 5CM506 Data Driven Systems
-- Student ID: 100774690
-- =====================================================================

-- Create and switch to dedicated schema
CREATE SCHEMA IF NOT EXISTS aeronetb;
SET search_path TO aeronetb;

-- =====================================================================
-- DOMAIN 1: Supplier & Part
-- =====================================================================

CREATE TABLE supplier (
    supplier_id     SERIAL PRIMARY KEY,
    business_name   VARCHAR(200) NOT NULL,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20),
    phone           VARCHAR(30),
    email           VARCHAR(200),
    website         VARCHAR(300),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE supplier IS 'Master records for all external aerospace component suppliers.';

CREATE TABLE accreditation (
    accreditation_id    SERIAL PRIMARY KEY,
    supplier_id         INTEGER NOT NULL REFERENCES supplier(supplier_id) ON DELETE RESTRICT,
    accreditation_type  VARCHAR(50) NOT NULL,   -- e.g. ISO 9001, AS9100, NADCAP
    issue_date          DATE NOT NULL,
    expiry_date         DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active','Expired','Suspended'))
);

COMMENT ON TABLE accreditation IS 'ISO/AS/NADCAP certifications held by each supplier.';

CREATE TABLE part (
    part_id     SERIAL PRIMARY KEY,
    part_name   VARCHAR(200) NOT NULL,
    description TEXT,
    category    VARCHAR(100),               -- fuselage, wing, engine, landing_gear
    created_at  TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE part IS 'Catalogue of all aerospace components sourced from suppliers.';

CREATE TABLE supplier_part (
    supplier_part_id    SERIAL PRIMARY KEY,
    supplier_id         INTEGER NOT NULL REFERENCES supplier(supplier_id) ON DELETE RESTRICT,
    part_id             INTEGER NOT NULL REFERENCES part(part_id)         ON DELETE RESTRICT,
    unit_price          NUMERIC(12,2),
    lead_time_days      INTEGER,
    UNIQUE(supplier_id, part_id)
);

COMMENT ON TABLE supplier_part IS 'Resolves M:N between supplier and part; stores per-supplier pricing and lead time.';

-- =====================================================================
-- DOMAIN 2: Orders & Shipments
-- =====================================================================

CREATE TABLE purchase_order (
    order_id                SERIAL PRIMARY KEY,
    supplier_id             INTEGER NOT NULL REFERENCES supplier(supplier_id) ON DELETE RESTRICT,
    created_by_emp_id       INTEGER,            -- FK added after employee table
    order_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    desired_delivery_date   DATE,
    actual_delivery_date    DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'placed'
                            CHECK (status IN ('placed','confirmed','dispatched','delivered','completed'))
);

COMMENT ON TABLE purchase_order IS 'Header record for each procurement order placed with a supplier.';

CREATE TABLE order_item (
    order_item_id   SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES purchase_order(order_id) ON DELETE RESTRICT,
    part_id         INTEGER NOT NULL REFERENCES part(part_id)            ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL           -- price locked at order time
);

COMMENT ON TABLE order_item IS 'Line items within a purchase order; price is locked at order creation time.';

CREATE TABLE shipment (
    shipment_id         SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES purchase_order(order_id) ON DELETE RESTRICT,
    tracking_number     VARCHAR(100),
    carrier             VARCHAR(100),
    port_of_entry       VARCHAR(150),
    ship_date           DATE,
    estimated_arrival   DATE
);

COMMENT ON TABLE shipment IS 'Physical shipment record linked to a purchase order; tracking updates stored in MongoDB.';

-- =====================================================================
-- DOMAIN 3: Equipment
-- =====================================================================

CREATE TABLE equipment (
    equipment_id        SERIAL PRIMARY KEY,
    equipment_name      VARCHAR(200) NOT NULL,
    equipment_type      VARCHAR(100),           -- CNC machine, press, oven, container
    facility            VARCHAR(150),
    installation_date   DATE,
    status              VARCHAR(20) DEFAULT 'Operational'
                        CHECK (status IN ('Operational','Maintenance','Offline'))
);

COMMENT ON TABLE equipment IS 'Production machinery and tracked shipping containers; IoT readings stored in MongoDB.';

-- =====================================================================
-- DOMAIN 4: Employee, Roles & Access Control
-- =====================================================================

CREATE TABLE employee (
    emp_id          SERIAL PRIMARY KEY,
    full_name       VARCHAR(200) NOT NULL,
    job_title       VARCHAR(100),
    department      VARCHAR(100),
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt hash
    access_level    VARCHAR(20)  NOT NULL DEFAULT 'read'
                    CHECK (access_level IN ('read','write','approve','audit')),
    auth_id         VARCHAR(100) UNIQUE,     -- external IdP reference
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE employee IS 'All system users. Subtypes extend with role-specific columns via shared-PK pattern.';

-- Now that employee exists, add the FK deferred above
ALTER TABLE purchase_order
    ADD CONSTRAINT fk_po_employee FOREIGN KEY (created_by_emp_id)
    REFERENCES employee(emp_id) ON DELETE SET NULL;

CREATE TABLE role (
    role_id     SERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

COMMENT ON TABLE role IS 'Named permission groups: ProcurementOfficer, QualityInspector, SupplyChainManager, EquipmentEngineer, Auditor.';

CREATE TABLE employee_role (
    emp_id          INTEGER NOT NULL REFERENCES employee(emp_id) ON DELETE CASCADE,
    role_id         INTEGER NOT NULL REFERENCES role(role_id)    ON DELETE CASCADE,
    assigned_date   DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (emp_id, role_id)
);

COMMENT ON TABLE employee_role IS 'Many-to-many junction assigning one or more roles to each employee.';

-- Role-specific extension tables (shared-primary-key / subtype pattern)
CREATE TABLE procurement_officer (
    emp_id              INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
    region_managed      VARCHAR(100),
    authorization_limit NUMERIC(12,2)
);

CREATE TABLE quality_inspector (
    emp_id              INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
    inspector_cert_id   VARCHAR(100),
    specialization      VARCHAR(100),    -- dimensional, NDT, environmental
    digital_signature   BYTEA
);

CREATE TABLE supply_chain_manager (
    emp_id                  INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
    assigned_product_line   VARCHAR(100),
    reporting_level         VARCHAR(50),
    dashboard_preferences   JSONB
);

CREATE TABLE equipment_engineer (
    emp_id              INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
    engineering_license VARCHAR(100),
    assigned_facility   VARCHAR(150)
);

CREATE TABLE auditor (
    emp_id                  INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
    regulatory_authority    VARCHAR(200),
    license_id              VARCHAR(100),
    audit_scope             TEXT
);

-- =====================================================================
-- DOMAIN 5: Audit Log
-- =====================================================================

CREATE TABLE audit_log (
    log_id       BIGSERIAL PRIMARY KEY,
    emp_id       INTEGER NOT NULL REFERENCES employee(emp_id) ON DELETE RESTRICT,
    action_type  VARCHAR(20) NOT NULL
                 CHECK (action_type IN ('view','create','update','delete','approve')),
    entity_type  VARCHAR(50) NOT NULL,   -- table or collection name
    entity_id    VARCHAR(50),            -- record identifier
    timestamp    TIMESTAMP DEFAULT NOW(),
    details      JSONB                   -- flexible context (old_value, new_value, IP, etc.)
);

COMMENT ON TABLE audit_log IS 'Append-only immutable log of every data access and modification event.';

-- =====================================================================
-- INDEXES  (performance for common dashboard queries)
-- =====================================================================

-- Supplier domain
CREATE INDEX idx_supplier_country     ON supplier(country);
CREATE INDEX idx_accred_supplier      ON accreditation(supplier_id);
CREATE INDEX idx_accred_status        ON accreditation(status);
CREATE INDEX idx_sp_supplier          ON supplier_part(supplier_id);
CREATE INDEX idx_sp_part              ON supplier_part(part_id);

-- Orders domain
CREATE INDEX idx_po_supplier          ON purchase_order(supplier_id);
CREATE INDEX idx_po_status            ON purchase_order(status);
CREATE INDEX idx_po_order_date        ON purchase_order(order_date);
CREATE INDEX idx_oi_order             ON order_item(order_id);
CREATE INDEX idx_shipment_order       ON shipment(order_id);

-- Equipment
CREATE INDEX idx_equip_status         ON equipment(status);
CREATE INDEX idx_equip_facility       ON equipment(facility);

-- Employee / role
CREATE INDEX idx_employee_email       ON employee(email);
CREATE INDEX idx_employee_active      ON employee(is_active);

-- Audit log (high-traffic table)
CREATE INDEX idx_audit_emp            ON audit_log(emp_id);
CREATE INDEX idx_audit_timestamp      ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_entity         ON audit_log(entity_type, entity_id);
