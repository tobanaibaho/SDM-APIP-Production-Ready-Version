CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. BASE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);

CREATE TABLE IF NOT EXISTS sdm_apip (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(18) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    jabatan VARCHAR(255),
    pangkat_golongan VARCHAR(255),
    pendidikan VARCHAR(255),
    nomor_hp VARCHAR(50),
    unit_kerja VARCHAR(255),
    foto VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sdm_apip_nip ON sdm_apip(nip);
CREATE INDEX IF NOT EXISTS idx_sdm_apip_deleted_at ON sdm_apip(deleted_at);

-- =============================================
-- 2. USER & AUTH
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(18) UNIQUE, -- Decoupled: Can be NULL for Admins
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending_verification', -- pending, email_verified, active, inactive
    role_id INTEGER NOT NULL DEFAULT 2 REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP,
    mfa_secret VARCHAR(100),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    last_ip VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_users_nip ON users(nip);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) DEFAULT 'email_verification',
    otp VARCHAR(10),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token_hash ON verification_tokens(token_hash);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =============================================
-- 3. ORGANIZATIONAL STRUCTURE
-- =============================================

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at);

CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Anggota',
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(user_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);

-- =============================================
-- 4. ASSESSMENT SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS assessment_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, semi_annual, annual
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assessment_periods_deleted_at ON assessment_periods(deleted_at);

CREATE TABLE IF NOT EXISTS peer_assessments (
    id SERIAL PRIMARY KEY,
    evaluator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, -- Nullable: NULL for cross-group relations
    period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    assessment_month INTEGER NOT NULL DEFAULT 1,
    
    -- ASN BerAKHLAK (Scale 1-100)
    berorientasi_pelayanan INTEGER NOT NULL DEFAULT 0 CHECK (berorientasi_pelayanan >= 0 AND berorientasi_pelayanan <= 100),
    akuntabel INTEGER NOT NULL DEFAULT 0 CHECK (akuntabel >= 0 AND akuntabel <= 100),
    kompeten INTEGER NOT NULL DEFAULT 0 CHECK (kompeten >= 0 AND kompeten <= 100),
    harmonis INTEGER NOT NULL DEFAULT 0 CHECK (harmonis >= 0 AND harmonis <= 100),
    loyal INTEGER NOT NULL DEFAULT 0 CHECK (loyal >= 0 AND loyal <= 100),
    adaptif INTEGER NOT NULL DEFAULT 0 CHECK (adaptif >= 0 AND adaptif <= 100),
    kolaboratif INTEGER NOT NULL DEFAULT 0 CHECK (kolaboratif >= 0 AND kolaboratif <= 100),
    
    comment TEXT,
    relation_type VARCHAR(20) DEFAULT 'Peer',
    target_position VARCHAR(20) DEFAULT 'Peer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT check_not_self CHECK (evaluator_id <> target_user_id),
    CONSTRAINT unique_assessment_per_month UNIQUE (evaluator_id, target_user_id, period_id, assessment_month)
);
CREATE INDEX IF NOT EXISTS idx_peer_evaluator ON peer_assessments(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_peer_target ON peer_assessments(target_user_id);
CREATE INDEX IF NOT EXISTS idx_peer_period ON peer_assessments(period_id);

CREATE TABLE IF NOT EXISTS assessment_relations (
    id SERIAL PRIMARY KEY,
    period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    evaluator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) NOT NULL, -- Perspektif Penilai: Atasan, Peer, Bawahan
    target_position VARCHAR(20) NOT NULL DEFAULT 'Peer', -- Posisi Target: Atasan, Peer, Bawahan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assessment_relations_period ON assessment_relations(period_id);

-- =============================================
-- 5. LOGGING & AUDIT
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =============================================
-- 6. SYSTEM LOGIC (TRIGGERS)
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sdm_apip_updated_at BEFORE UPDATE ON sdm_apip FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_periods_updated_at BEFORE UPDATE ON assessment_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. SEED DATA
-- =============================================

-- Default Roles
INSERT INTO roles (id, name, description) VALUES 
    (1, 'SuperAdmin', 'Administrator Sistem'),
    (2, 'User', 'Pegawai')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Initial Administrator
INSERT INTO users (nip, username, email, password, role_id, status) VALUES 
    (NULL, 'admin', 'unerojamu@gmail.com', '$2a$10$zTY21HR3m5wi6jkKN7UAOOrKtrxle16mdapoyzJ0//Rzow5XG/qTm', 1, 'active')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    status = EXCLUDED.status,
    role_id = EXCLUDED.role_id;



-- =============================================
-- 8. PERMISSIONS
-- =============================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sdm_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sdm_admin;
