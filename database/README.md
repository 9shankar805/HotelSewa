# Database Setup for Hotel Management System

This directory contains the database schema and migration files for the hotel management system, including the new React Native features implemented in Flutter.

## 📁 File Structure

```
database/
├── schema.sql                 # Complete database schema with all tables
├── migrations/
│   └── 001_initial_setup.sql  # Initial migration script
└── README.md                  # This file
```

## 🗄️ Database Tables

### Offers Management
- **`offers`** - Store hotel offers and promotions with business rules
- **`offer_usage`** - Track offer usage and revenue generation
- **`offer_analytics`** - Store offer performance analytics

### Calendar Management
- **`calendar_daily_data`** - Daily calendar data with occupancy and revenue
- **`calendar_bookings`** - Detailed booking information for calendar view
- **`calendar_room_availability`** - Room availability by date
- **`calendar_pricing`** - Dynamic pricing information by date
- **`calendar_analytics`** - Monthly calendar analytics and metrics

### Chat System
- **`chat_conversations`** - Chat conversations between hotel owners and guests/admins
- **`chat_messages`** - Individual chat messages with read status
- **`chat_message_attachments`** - File attachments for chat messages
- **`chat_online_status`** - Track user online status
- **`chat_analytics`** - Chat system analytics and metrics

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js and npm installed
- SQLite3 installed
- Prisma CLI installed globally: `npm install -g prisma`

### 2. Database Initialization

#### Option A: Using Prisma (Recommended)
```bash
# Navigate to the API directory
cd backend/api

# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev --name initial_setup

# Seed the database (optional)
npx prisma db seed
```

#### Option B: Using SQL Scripts
```bash
# Navigate to the database directory
cd backend/api/database

# Run the migration script
sqlite3 database.db < migrations/001_initial_setup.sql
```

### 3. Environment Setup
Create a `.env` file in the `backend/api` directory:
```env
DATABASE_URL="file:./dev.db"
PORT=4000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-here
```

## 📊 Key Features

### Offers Management
- ✅ **Full CRUD Operations** - Create, read, update, delete offers
- ✅ **Business Rules** - Min stay requirements, max discount limits
- ✅ **Date Validation** - Automatic validation of offer dates
- ✅ **Usage Tracking** - Track how many times offers are used
- ✅ **Analytics** - Revenue and conversion rate tracking

### Calendar Management
- ✅ **Visual Calendar** - Color-coded availability status
- ✅ **Daily Data** - Occupancy rates, revenue, booking counts
- ✅ **Room Availability** - Real-time room availability tracking
- ✅ **Dynamic Pricing** - Flexible pricing by date and room type
- ✅ **Date Blocking** - Block/unblock dates for maintenance or events

### Chat System
- ✅ **Real-Time Messaging** - Instant messaging between users
- ✅ **Read Receipts** - Track message read status
- ✅ **File Attachments** - Support for images and documents
- ✅ **Online Status** - Show user availability
- ✅ **Conversation Management** - Archive, delete, search conversations

## 🔧 API Endpoints

### Offers API
- `GET /api/offers` - Get all offers for authenticated user
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update existing offer
- `DELETE /api/offers/:id` - Delete offer
- `PATCH /api/offers/:id/status` - Toggle offer status
- `GET /api/offers/:id/analytics` - Get offer analytics
- `POST /api/offers/validate` - Validate offer data
- `GET /api/offers/stats` - Get offer statistics

### Calendar API
- `GET /api/calendar/:hotelId` - Get calendar data for month
- `GET /api/calendar/:hotelId/bookings` - Get bookings for date
- `GET /api/calendar/:hotelId/availability` - Get room availability
- `PATCH /api/calendar/:hotelId/availability/:roomId` - Update availability
- `POST /api/calendar/:hotelId/block` - Block/unblock dates
- `GET /api/calendar/:hotelId/analytics` - Get calendar analytics
- `GET /api/calendar/:hotelId/pricing` - Get pricing for date range
- `PATCH /api/calendar/:hotelId/pricing` - Update pricing

### Chat API
- `GET /api/chat` - Get all conversations
- `GET /api/chat/:conversationId/messages` - Get conversation messages
- `POST /api/chat/:conversationId/messages` - Send message
- `POST /api/chat` - Create new conversation
- `PATCH /api/chat/:conversationId/read` - Mark messages as read
- `GET /api/chat/unread/count` - Get unread message count
- `GET /api/chat/search` - Search conversations
- `GET /api/chat/stats` - Get chat statistics
- `PATCH /api/chat/:conversationId/archive` - Archive conversation
- `DELETE /api/chat/:conversationId` - Delete conversation
- `POST /api/chat/online` - Update online status

## 🔄 Database Relationships

### Offers Flow
```
Hotels → Offers → Offer Usage → Offer Analytics
```

### Calendar Flow
```
Hotels → Calendar Daily Data → Calendar Bookings
Hotels → Calendar Room Availability → Calendar Pricing
Hotels → Calendar Analytics
```

### Chat Flow
```
Hotels → Chat Conversations → Chat Messages → Chat Attachments
Users → Chat Online Status → Chat Analytics
```

## 📈 Performance Optimizations

### Indexes
- All foreign keys are indexed
- Date fields have composite indexes
- Status fields have indexes for filtering
- Search fields have full-text indexes

### Triggers
- Automatic unread count updates
- Conversation last message updates
- Online status tracking

### Views
- Pre-computed summary views for common queries
- Analytics views for reporting
- Status summary views for dashboards

## 🛠️ Maintenance

### Regular Tasks
1. **Database Backup**: Regular backups of SQLite database
2. **Analytics Updates**: Run analytics aggregation scripts
3. **Data Cleanup**: Remove old chat messages and expired offers
4. **Performance Monitoring**: Check query performance and indexes

### Migration Process
1. Create new migration file in `migrations/` directory
2. Test migration on development database
3. Apply to production database
4. Update Prisma schema if needed

## 🔍 Troubleshooting

### Common Issues
1. **Migration Failures**: Check for syntax errors in SQL
2. **Foreign Key Constraints**: Ensure parent records exist
3. **Index Performance**: Monitor slow queries and add indexes
4. **Data Consistency**: Use transactions for multi-table operations

### Debug Commands
```bash
# Check database schema
sqlite3 database.db ".schema"

# Check table data
sqlite3 database.db "SELECT COUNT(*) FROM offers;"

# Check indexes
sqlite3 database.db ".indexes"

# Run query analysis
sqlite3 database.db "EXPLAIN QUERY PLAN SELECT * FROM offers;"
```

## 📚 Additional Resources

- [SQLite Documentation](https://sqlite.org/docs.html)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Node.js Database Best Practices](https://github.com/felixge/node-mysql#best-practices)

## 🤝 Contributing

When making changes to the database schema:

1. Create a new migration file
2. Update the Prisma schema
3. Add tests for new functionality
4. Update this README with changes
5. Test thoroughly before deployment

## 📝 Notes

- All timestamps are stored in UTC
- JSON fields are stored as TEXT and parsed in application code
- Soft deletes are used for most entities (deleted_at field)
- UUIDs are used for primary keys for better scalability
- Database is SQLite for development, can be migrated to PostgreSQL for production
