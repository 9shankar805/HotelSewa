-- Offers Management Tables
CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    discount DECIMAL(10,2) NOT NULL,
    discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    min_stay INT NOT NULL DEFAULT 1,
    max_discount DECIMAL(10,2),
    applicable_room_types JSON,
    applicable_days JSON,
    max_usage INT,
    current_usage INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_offers_hotel_id (hotel_id),
    INDEX idx_offers_dates (valid_from, valid_to),
    INDEX idx_offers_active (is_active),
    INDEX idx_offers_created_at (created_at)
);

-- Offer Usage Tracking
CREATE TABLE IF NOT EXISTS offer_usage (
    id VARCHAR(36) PRIMARY KEY,
    offer_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36) NOT NULL,
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    INDEX idx_offer_usage_offer_id (offer_id),
    INDEX idx_offer_usage_booking_id (booking_id)
);

-- Calendar Management Tables
CREATE TABLE IF NOT EXISTS calendar_daily_data (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    total_rooms INT NOT NULL DEFAULT 0,
    available_rooms INT NOT NULL DEFAULT 0,
    occupied_rooms INT NOT NULL DEFAULT 0,
    blocked_rooms INT NOT NULL DEFAULT 0,
    total_bookings INT NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    occupancy_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_hotel_date (hotel_id, date),
    INDEX idx_calendar_hotel_id (hotel_id),
    INDEX idx_calendar_date (date),
    INDEX idx_calendar_blocked (is_blocked)
);

-- Calendar Bookings
CREATE TABLE IF NOT EXISTS calendar_bookings (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(36) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_count INT NOT NULL DEFAULT 1,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_calendar_bookings_hotel_id (hotel_id),
    INDEX idx_calendar_bookings_dates (check_in_date, check_out_date),
    INDEX idx_calendar_bookings_status (status),
    INDEX idx_calendar_bookings_room_id (room_id)
);

-- Calendar Room Availability
CREATE TABLE IF NOT EXISTS calendar_room_availability (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(36) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    price DECIMAL(10,2),
    booking_id VARCHAR(36),
    guest_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_room_date (room_id, date),
    INDEX idx_calendar_availability_hotel_id (hotel_id),
    INDEX idx_calendar_availability_date (date),
    INDEX idx_calendar_availability_available (is_available),
    INDEX idx_calendar_availability_booking_id (booking_id)
);

-- Calendar Pricing
CREATE TABLE IF NOT EXISTS calendar_pricing (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    room_prices JSON NOT NULL,
    average_price DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2) NOT NULL,
    max_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_hotel_date_price (hotel_id, date),
    INDEX idx_calendar_pricing_hotel_id (hotel_id),
    INDEX idx_calendar_pricing_date (date)
);

-- Chat System Tables
CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    participant_id VARCHAR(36) NOT NULL,
    participant_name VARCHAR(255) NOT NULL,
    participant_type ENUM('guest', 'admin', 'support', 'owner') NOT NULL,
    participant_avatar VARCHAR(255),
    last_message_id VARCHAR(36),
    unread_count INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_chat_conversations_hotel_id (hotel_id),
    INDEX idx_chat_conversations_participant_id (participant_id),
    INDEX idx_chat_conversations_updated_at (updated_at),
    INDEX idx_chat_conversations_archived (is_archived),
    INDEX idx_chat_conversations_unread (unread_count)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_type ENUM('guest', 'admin', 'support', 'owner') NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') NOT NULL DEFAULT 'text',
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    INDEX idx_chat_messages_conversation_id (conversation_id),
    INDEX idx_chat_messages_sender_id (sender_id),
    INDEX idx_chat_messages_created_at (created_at),
    INDEX idx_chat_messages_read (is_read),
    INDEX idx_chat_messages_type (message_type)
);

-- Chat Message Attachments
CREATE TABLE IF NOT EXISTS chat_message_attachments (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    INDEX idx_chat_attachments_message_id (message_id)
);

-- Chat Online Status
CREATE TABLE IF NOT EXISTS chat_online_status (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_type ENUM('guest', 'admin', 'support', 'owner') NOT NULL,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_online (user_id, user_type),
    INDEX idx_chat_online_status_user_id (user_id),
    INDEX idx_chat_online_status_online (is_online),
    INDEX idx_chat_online_status_last_seen (last_seen)
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS offer_analytics (
    id VARCHAR(36) PRIMARY KEY,
    offer_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    total_uses INT NOT NULL DEFAULT 0,
    revenue_generated DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    INDEX idx_offer_analytics_offer_id (offer_id),
    INDEX idx_offer_analytics_date (date)
);

CREATE TABLE IF NOT EXISTS calendar_analytics (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    occupancy_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    revenue_growth DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    new_bookings INT NOT NULL DEFAULT 0,
    cancelled_bookings INT NOT NULL DEFAULT 0,
    average_booking_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_guests INT NOT NULL DEFAULT 0,
    room_type_performance JSON,
    top_booking_dates JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_hotel_month_year (hotel_id, month, year),
    INDEX idx_calendar_analytics_hotel_id (hotel_id),
    INDEX idx_calendar_analytics_month_year (month, year)
);

CREATE TABLE IF NOT EXISTS chat_analytics (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    total_conversations INT NOT NULL DEFAULT 0,
    unread_messages INT NOT NULL DEFAULT 0,
    active_conversations INT NOT NULL DEFAULT 0,
    archived_conversations INT NOT NULL DEFAULT 0,
    messages_today INT NOT NULL DEFAULT 0,
    messages_this_week INT NOT NULL DEFAULT 0,
    average_response_time DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    conversations_by_type JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_chat_analytics_hotel_id (hotel_id),
    INDEX idx_chat_analytics_created_at (created_at)
);

-- Triggers for automatic updates
DELIMITER //

-- Trigger to update calendar daily data when bookings change
CREATE TRIGGER IF NOT EXISTS update_calendar_daily_data_on_booking
AFTER INSERT ON calendar_bookings
FOR EACH ROW
BEGIN
    INSERT INTO calendar_daily_data (hotel_id, date, total_rooms, occupied_rooms, total_bookings, total_revenue, occupancy_rate)
    VALUES (NEW.hotel_id, NEW.check_in_date, 
            (SELECT COUNT(*) FROM rooms WHERE hotel_id = NEW.hotel_id),
            1, 1, NEW.total_amount, 
            (SELECT CASE WHEN COUNT(*) > 0 THEN 1.0 / COUNT(*) ELSE 0 END FROM rooms WHERE hotel_id = NEW.hotel_id))
    ON DUPLICATE KEY UPDATE
        occupied_rooms = occupied_rooms + 1,
        total_bookings = total_bookings + 1,
        total_revenue = total_revenue + NEW.total_amount,
        occupancy_rate = (occupied_rooms + 1) / total_rooms;
END//

-- Trigger to update conversation unread count when new message is added
CREATE TRIGGER IF NOT EXISTS update_conversation_unread_count
AFTER INSERT ON chat_messages
FOR EACH ROW
BEGIN
    UPDATE chat_conversations 
    SET unread_count = unread_count + 1,
        last_message_id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
END//

-- Trigger to update conversation unread count when message is read
CREATE TRIGGER IF NOT EXISTS update_conversation_unread_count_on_read
AFTER UPDATE ON chat_messages
FOR EACH ROW
BEGIN
    IF NEW.is_read = 1 AND OLD.is_read = 0 THEN
        UPDATE chat_conversations 
        SET unread_count = GREATEST(unread_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
    END IF;
END//

DELIMITER ;

-- Views for common queries
CREATE VIEW IF NOT EXISTS offer_summary AS
SELECT 
    hotel_id,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_offers,
    COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_offers,
    COUNT(CASE WHEN valid_from > CURRENT_DATE THEN 1 END) as upcoming_offers,
    COUNT(CASE WHEN valid_to < CURRENT_DATE THEN 1 END) as expired_offers,
    SUM(discount) as total_discount_value
FROM offers
WHERE deleted_at IS NULL
GROUP BY hotel_id;

CREATE VIEW IF NOT EXISTS calendar_monthly_summary AS
SELECT 
    hotel_id,
    YEAR(date) as year,
    MONTH(date) as month,
    COUNT(*) as total_days,
    SUM(total_bookings) as total_bookings,
    SUM(total_revenue) as total_revenue,
    AVG(occupancy_rate) as average_occupancy,
    SUM(CASE WHEN is_blocked = 1 THEN 1 END) as blocked_days
FROM calendar_daily_data
GROUP BY hotel_id, YEAR(date), MONTH(date);

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
