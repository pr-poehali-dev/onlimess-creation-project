CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    has_logged_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, contact_email)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_from ON messages(from_email);
CREATE INDEX idx_messages_to ON messages(to_email);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_contacts_user ON contacts(user_email);
