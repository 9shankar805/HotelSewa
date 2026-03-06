-- Initial Database Setup for Hotel Management System
-- This script creates all necessary tables for the new features

-- Offers Management Tables
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    discount REAL NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    min_stay INTEGER NOT NULL DEFAULT 1,
    max_discount REAL,
    applicable_room_types TEXT, -- JSON string
    applicable_days TEXT, -- JSON string
    max_usage INTEGER,
    current_usage INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Offer Usage Tracking
CREATE TABLE IF NOT EXISTS offer_usage (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    discount_applied REAL NOT NULL,
    used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Calendar Management Tables
CREATE TABLE IF NOT EXISTS calendar_daily_data (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    available_rooms INTEGER NOT NULL DEFAULT 0,
    occupied_rooms INTEGER NOT NULL DEFAULT 0,
    blocked_rooms INTEGER NOT NULL DEFAULT 0,
    total_bookings INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0.00,
    occupancy_rate REAL NOT NULL DEFAULT 0.0000,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    block_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (hotel_id, date),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Calendar Bookings
CREATE TABLE IF NOT EXISTS calendar_bookings (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Calendar Room Availability
CREATE TABLE IF NOT EXISTS calendar_room_availability (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL,
    date TEXT NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    price REAL,
    booking_id TEXT,
    guest_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (room_id, date),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Calendar Pricing
CREATE TABLE IF NOT EXISTS calendar_pricing (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    date TEXT NOT NULL,
    room_prices TEXT NOT NULL, -- JSON string
    average_price REAL NOT NULL,
    min_price REAL NOT NULL,
    max_price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (hotel_id, date),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Chat System Tables
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    hotel_id TEXT,
    participant_id TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('guest', 'admin', 'support', 'owner')),
    participant_avatar TEXT,
    last_message_id TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_online INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'admin', 'support', 'owner')),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    file_url TEXT,
    file_name TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

-- Chat Message Attachments
CREATE TABLE IF NOT EXISTS chat_message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

-- Chat Online Status
CREATE TABLE IF NOT EXISTS chat_online_status (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('guest', 'admin', 'support', 'owner')),
    is_online INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (user_id, user_type)
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS offer_analytics (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_uses INTEGER NOT NULL DEFAULT 0,
    revenue_generated REAL NOT NULL DEFAULT 0.00,
    conversion_rate REAL NOT NULL DEFAULT 0.0000,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calendar_analytics (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    occupancy_rate REAL NOT NULL DEFAULT 0.0000,
    revenue_growth REAL NOT NULL DEFAULT 0.00,
    new_bookings INTEGER NOT NULL DEFAULT 0,
    cancelled_bookings INTEGER NOT NULL DEFAULT 0,
    average_booking_value REAL NOT NULL DEFAULT 0.00,
    total_guests INTEGER NOT NULL DEFAULT 0,
    room_type_performance TEXT, -- JSON string
    top_booking_dates TEXT, -- JSON string
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (hotel_id, month, year),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_analytics (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    total_conversations INTEGER NOT NULL DEFAULT 0,
    unread_messages INTEGER NOT NULL DEFAULT 0,
    active_conversations INTEGER NOT NULL DEFAULT 0,
    archived_conversations INTEGER NOT NULL DEFAULT 0,
    messages_today INTEGER NOT NULL DEFAULT 0,
    messages_this_week INTEGER NOT NULL DEFAULT 0,
    average_response_time REAL NOT NULL DEFAULT 0.00,
    conversations_by_type TEXT, -- JSON string
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offers_hotel_id ON offers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at);

CREATE INDEX IF NOT EXISTS idx_calendar_daily_data_hotel_id ON calendar_daily_data(hotel_id);
CREATE INDEX IF NOT EXISTS idx_calendar_daily_data_date ON calendar_daily_data(date);
CREATE INDEX IF NOT EXISTS idx_calendar_daily_data_blocked ON calendar_daily_data(is_blocked);

CREATE INDEX IF NOT EXISTS idx_calendar_bookings_hotel_id ON calendar_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_dates ON calendar_bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_status ON calendar_bookings(status);

CREATE INDEX IF NOT EXISTS idx_calendar_room_availability_hotel_id ON calendar_room_availability(hotel_id);
CREATE INDEX IF NOT EXISTS idx_calendar_room_availability_date ON calendar_room_availability(date);
CREATE INDEX IF NOT EXISTS idx_calendar_room_availability_available ON calendar_room_availability(is_available);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_hotel_id ON chat_conversations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_archived ON chat_conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_unread ON chat_conversations(unread_count);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read);

-- Create triggers for automatic updates
-- Trigger to update conversation unread count when new message is added
CREATE TRIGGER IF NOT EXISTS update_conversation_unread_count
AFTER INSERT ON chat_messages
BEGIN
    UPDATE chat_conversations 
    SET unread_count = unread_count + 1,
        last_message_id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
END;

-- Trigger to update conversation unread count when message is read
CREATE TRIGGER IF NOT EXISTS update_conversation_unread_count_on_read
AFTER UPDATE ON chat_messages
WHEN NEW.is_read = 1 AND OLD.is_read = 0
BEGIN
    UPDATE chat_conversations 
    SET unread_count = MAX(unread_count - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
END;

-- Create views for common queries
CREATE VIEW IF NOT EXISTS offer_summary AS
SELECT 
    hotel_id,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_offers,
    COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_offers,
    COUNT(CASE WHEN valid_from > date('now') THEN 1 END) as upcoming_offers,
    COUNT(CASE WHEN valid_to < date('now') THEN 1 END) as expired_offers,
    SUM(discount) as total_discount_value
FROM offers
WHERE deleted_at IS NULL
GROUP BY hotel_id;

CREATE VIEW IF NOT EXISTS calendar_monthly_summary AS
SELECT 
    hotel_id,
    strftime('%Y', date) as year,
    strftime('%m', date) as month,
    COUNT(*) as total_days,
    SUM(total_bookings) as total_bookings,
    SUM(total_revenue) as total_revenue,
    AVG(occupancy_rate) as average_occupancy,
    SUM(CASE WHEN is_blocked = 1 THEN 1 END) as blocked_days
FROM calendar_daily_data
GROUP BY hotel_id, strftime('%Y', date), strftime('%m', date);

CREATE VIEW IF NOT EXISTS chat_summary AS
SELECT 
    hotel_id,
    COUNT(*) as total_conversations,
    COUNT(CASE WHEN is_archived = 0 THEN 1 END) as active_conversations,
    COUNT(CASE WHEN is_archived = 1 THEN 1 END) as archived_conversations,
    SUM(unread_count) as total_unread_messages,
    COUNT(CASE WHEN is_online = 1 THEN 1 END) as online_participants
FROM chat_conversations
WHERE deleted_at IS NULL
GROUP BY hotel_id;

-- Insert sample data for testing (optional)
INSERT OR IGNORE INTO offers (
    id, hotel_id, title, description, discount, discount_type, 
    valid_from, valid_to, is_active, min_stay, created_at, updated_at
) VALUES 
    (
        'offer-1', 'hotel-1', 'Weekend Special', '20% off on weekend bookings', 
        20, 'percentage', '2024-01-01', '2024-12-31', 1, 2, 
        datetime('now'), datetime('now')
    ),
    (
        'offer-2', 'hotel-1', 'Early Bird', 'Book 7 days in advance and save ₹500', 
        500, 'fixed', '2024-01-15', '2024-12-31', 1, 1, 
        datetime('now'), datetime('now')
    );

-- Create default chat analytics for existing hotels
INSERT OR IGNORE INTO chat_analytics (id, hotel_id, created_at, updated_at)
SELECT 
    'chat-analytics-' || id,
    id,
    datetime('now'),
    datetime('now')
FROM hotels;

-- Create default calendar analytics for existing hotels
INSERT OR IGNORE INTO calendar_analytics (id, hotel_id, month, year, created_at, updated_at)
SELECT 
    'calendar-analytics-' || id || '-' || strftime('%m', 'now') || '-' || strftime('%Y', 'now'),
    id,
    cast(strftime('%m', 'now') as INTEGER),
    cast(strftime('%Y', 'now') as INTEGER),
    datetime('now'),
    datetime('now')
FROM hotels;
