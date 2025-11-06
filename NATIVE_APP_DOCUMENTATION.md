# Y2J Commissary - Native App Development Documentation

## Project Overview
This is a comprehensive commissary management system with POS, inventory, GPS tracking, and customer management capabilities. The app supports multiple user roles with different access levels.

---

## 1. User Roles & Permissions

### Role Hierarchy
- **Customer**: Can place orders, view their violations, manage profile
- **Worker**: Can process orders, manage inventory, track GPS, clock in/out
- **Manager**: Worker permissions + manage products, purchase orders, stock takes
- **Admin**: Manager permissions + manage users, settings, categories
- **Super Admin**: Full system access
- **Owner**: Can view assigned customers' data and balances

---

## 2. Application Pages/Screens

### 2.1 Authentication
- **Route**: `/auth`
- **Features**:
  - Email/password sign up
  - Email/password login
  - Auto-confirm email (enabled)
  - Profile creation on signup

### 2.2 Main Dashboard (Role-based)
Different landing pages based on role:
- Customer → Products page
- Worker → Worker dashboard
- Manager → Manager dashboard
- Admin → Admin Hub
- Owner → Owner dashboard

### 2.3 POS System (`/pos`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Products overview card
- Orders management card
- Inventory management card
- Analytics card
- Receipt settings card

### 2.4 Products (`/products`)
**Access**: All authenticated users

Features:
- Product grid/list view
- Product search and filtering by category
- Box size selection (1 box, 1/2 box, 1/4 box)
- Add to cart functionality
- Product image display
- Price display (adjusted by box size)
- Stock availability indicator

### 2.5 Orders Management

#### 2.5.1 Active Orders (`/orders`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- View all pending/processing orders
- Filter by status (pending, processing, completed)
- Assign orders to workers
- Update order status
- View order items and details
- Customer information display
- Total calculation (items + service fee)

#### 2.5.2 Processed Orders (`/processed-orders`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- View completed orders history
- Search orders by customer name or cart number
- Date range filtering
- Order details modal
- Payment status tracking

#### 2.5.3 Customer View - My Orders
**Access**: Customer

Features:
- View own order history
- Add notes to pending orders
- Real-time order status updates
- Order details with itemized list

### 2.6 Inventory Management (`/inventory`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Low stock alerts dashboard
- Barcode scanner for quick product lookup
- Stock level monitoring
- Reorder point tracking

### 2.7 Stock Take (`/stock-take`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Create new stock take sessions
- Scan products and record actual quantities
- View variance between expected and actual
- Complete stock take and update inventory
- Stock take history

### 2.8 Purchase Orders (`/purchase-orders`)
**Access**: Manager, Admin, Super Admin

Features:
- Create purchase orders
- Add items to purchase orders
- Track PO status (pending, received)
- Supplier management
- Mark as received (updates inventory)

### 2.9 GPS Fleet Tracking (`/gps`)

#### 2.9.1 Fleet Map (`/fleet-map`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Real-time vehicle location on Mapbox
- Vehicle markers with status indicators
- Vehicle details popup
- Route tracking

#### 2.9.2 Fleet Vehicles (`/fleet-vehicles`)
**Access**: Admin, Super Admin

Features:
- Add/edit/delete vehicles
- Assign drivers to vehicles
- Set tracking type (mobile_app or gps_device)
- Vehicle details (make, model, year, VIN, license plate)
- Vehicle status management

#### 2.9.3 GPS Settings (`/gps-settings`)
**Access**: Admin, Super Admin

Features:
- Configure tracking intervals
- Set alert preferences
- GPS system configuration

#### 2.9.4 GPS Alerts (`/gps-alerts`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- View GPS-related alerts
- Alert notifications
- Alert history

#### 2.9.5 Geofencing (`/geofencing`)
**Access**: Manager, Admin, Super Admin

Features:
- Create circular or polygon geofences
- Set entry/exit alerts
- Manage geofence status
- View geofences on map

#### 2.9.6 Fleet History (`/fleet-history`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Historical location data
- Route playback
- Date/time filtering
- Vehicle-specific history

#### 2.9.7 Mobile GPS Tracker Component
**For Drivers**: Real-time location tracking in background

### 2.10 Customer Management

#### 2.10.1 Customers List (`/customers`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- View all customers
- Search customers
- Customer profile details
- Cart assignments
- Customer balances

#### 2.10.2 Customer Violations (`/customer-violations`)
**Access**: Customer, Owner

Features:
- View violations for customer's cart
- Filter by status and severity
- View violation images

#### 2.10.3 Weekly Balances
**Access**: Customer (own), Owner (assigned customers), Admin

Features:
- Weekly order totals
- Franchise fees
- Commissary rent
- Old balance rollover
- Payment tracking
- Remaining balance calculation

### 2.11 Violations Management (`/violations`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Create violation reports
- Link to customers or manual entry
- Severity levels (low, medium, high, critical)
- Violation types
- Image upload capability
- Status tracking (pending, resolved, dismissed)
- Resolution notes

### 2.12 Employee Management

#### 2.12.1 Employee Shifts (`/employee-shifts`)
**Access**: Worker (own shifts), Manager, Admin, Super Admin

Features:
- Clock in/out functionality
- View shift history
- Calculate hours worked
- Shift notes
- Manager can edit all shifts

### 2.13 Analytics (`/analytics`)
**Access**: Worker, Manager, Admin, Super Admin

Features:
- Sales metrics dashboard
- Revenue charts
- Category breakdown
- Top products
- Date range filtering
- Export capabilities

### 2.14 Profile (`/profile`)
**Access**: All authenticated users

Features:
- View/edit profile information
- Update full name
- Update cart name and number (for customers)
- Update phone number
- Change password
- View user role(s)

### 2.15 Admin Hub (`/admin-hub`)
**Access**: Admin, Super Admin

Central dashboard with links to:
- User management
- Orders management
- Products management
- Categories management
- Settings configuration
- SMS management
- Announcements
- Violations
- Cart assignments
- Processed orders
- Balance management
- Deleted orders

#### 2.15.1 Admin Users (`/admin/users`)
Features:
- View all users
- Edit user profiles
- Update user roles
- Reset passwords
- Delete users

#### 2.15.2 Admin Products (`/admin/products`)
Features:
- Add/edit/delete products
- Image upload
- Category assignment
- Box size configuration
- Pricing and stock management

#### 2.15.3 Admin Categories (`/admin/categories`)
Features:
- Create/edit/delete categories
- Category descriptions

#### 2.15.4 Admin Settings (`/admin/settings`)
Features:
- Company information
- Logo management
- Background image management
- Service fee configuration
- Franchise fee configuration
- Commissary rent configuration
- Email/phone settings

#### 2.15.5 Admin SMS (`/admin/sms`)
Features:
- Send bulk SMS to customers
- SMS history
- Customer selection

#### 2.15.6 Admin Announcements (`/admin/announcements`)
Features:
- Create system-wide announcements
- Set announcement priority
- Schedule announcements
- Role-based targeting

#### 2.15.7 Admin Balances (`/admin/balances`)
Features:
- View all customer weekly balances
- Edit payment amounts
- Mark as paid
- Rollover unpaid balances

#### 2.15.8 Admin Cart Assignments (`/admin/cart-assignments`)
Features:
- Assign customers to owners
- Manage cart ownership
- View assignments

### 2.16 Receipt Management

#### 2.16.1 Receipt Settings (`/receipt-settings`)
**Access**: Admin, Super Admin

Features:
- Configure Star TSP143IV printer
- Test print functionality
- Printer connection management

#### 2.16.2 Receipt Templates (`/receipt-templates`)
**Access**: Admin, Super Admin

Features:
- Create receipt templates
- Customize header/footer text
- Paper width settings
- Logo display options
- Barcode options

### 2.17 Hardware Setup (`/hardware-setup`)
**Access**: Admin, Super Admin

Features:
- Star printer setup guide
- Barcode scanner configuration
- Hardware testing tools

### 2.18 Privacy Policy (`/privacy-policy`)
**Access**: Public

Features:
- Display privacy policy
- Legal information

---

## 3. Database Tables

### 3.1 Authentication & Users

#### profiles
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `full_name` (text)
- `cart_name` (text)
- `cart_number` (text)
- `phone` (text, E.164 format)
- `total_spent` (numeric)
- `loyalty_points` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### user_roles
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `role` (enum: customer, worker, manager, admin, super_admin, owner)
- `created_at` (timestamp)

#### role_change_audit
- `id` (uuid, primary key)
- `user_id` (uuid)
- `old_role` (app_role)
- `new_role` (app_role)
- `changed_by` (uuid)
- `changed_at` (timestamp)

#### user_phone_numbers
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `phone_number` (text)
- `is_primary` (boolean)
- `created_at` (timestamp)

#### customer_phones
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles)
- `phone` (text)
- `is_primary` (boolean)
- `sms_consent` (boolean)
- `sms_consent_date` (timestamp)
- `created_at` (timestamp)

### 3.2 Products & Categories

#### categories
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `created_at` (timestamp)

#### products
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `price` (numeric)
- `cost_price` (numeric)
- `quantity` (integer)
- `category_id` (uuid, references categories)
- `image_url` (text)
- `box_sizes` (text array, default: ['1 box'])
- `active` (boolean)
- `barcode` (text)
- `supplier_name` (text)
- `low_stock_threshold` (integer, default: 10)
- `reorder_point` (integer, default: 20)
- `reorder_quantity` (integer, default: 50)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3.3 Orders

#### orders
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles)
- `assigned_worker_id` (uuid, references profiles)
- `status` (enum: pending, processing, completed)
- `total` (numeric)
- `notes` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `deleted_at` (timestamp)

#### order_items
- `id` (uuid, primary key)
- `order_id` (uuid, references orders)
- `product_id` (uuid, references products)
- `quantity` (integer)
- `price` (numeric, calculated server-side)
- `box_size` (text, default: '1 box')
- `created_at` (timestamp)

### 3.4 Inventory Management

#### stock_takes
- `id` (uuid, primary key)
- `name` (text)
- `status` (text: in_progress, completed)
- `notes` (text)
- `created_by` (uuid, references profiles)
- `created_at` (timestamp)
- `completed_at` (timestamp)

#### stock_take_items
- `id` (uuid, primary key)
- `stock_take_id` (uuid, references stock_takes)
- `product_id` (uuid, references products)
- `expected_quantity` (integer)
- `actual_quantity` (integer)
- `variance` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### purchase_orders
- `id` (uuid, primary key)
- `supplier_name` (text)
- `status` (text: pending, received)
- `total` (numeric)
- `notes` (text)
- `created_by` (uuid, references profiles)
- `received_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3.5 GPS & Fleet Management

#### vehicles
- `id` (uuid, primary key)
- `name` (text)
- `vehicle_number` (text)
- `type` (text)
- `make` (text)
- `model` (text)
- `year` (integer)
- `license_plate` (text)
- `vin` (text)
- `tracking_type` (text: mobile_app, gps_device)
- `device_id` (text)
- `status` (text: active, inactive, maintenance)
- `assigned_driver_id` (uuid, references profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### location_history
- `id` (uuid, primary key)
- `vehicle_id` (uuid, references vehicles)
- `latitude` (numeric)
- `longitude` (numeric)
- `speed` (numeric)
- `heading` (numeric)
- `altitude` (numeric)
- `accuracy` (numeric)
- `tracking_source` (text)
- `timestamp` (timestamp)
- `created_at` (timestamp)

#### geofences
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `type` (text: circle, polygon)
- `center_lat` (numeric, for circles)
- `center_lng` (numeric, for circles)
- `radius` (numeric, for circles)
- `polygon_coords` (jsonb, for polygons)
- `alert_on_enter` (boolean)
- `alert_on_exit` (boolean)
- `active` (boolean)
- `created_by` (uuid)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### gps_settings
- `id` (uuid, primary key)
- `key` (text, unique)
- `value` (text)
- `updated_at` (timestamp)

### 3.6 Violations

#### violations
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles, nullable)
- `inspector_id` (uuid, references profiles)
- `violation_type` (text)
- `severity` (text: low, medium, high, critical)
- `description` (text)
- `status` (text: pending, resolved, dismissed)
- `resolution_notes` (text)
- `manual_customer_name` (text)
- `cart_name` (text)
- `cart_number` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `resolved_at` (timestamp)

#### violation_images
- `id` (uuid, primary key)
- `violation_id` (uuid, references violations)
- `image_url` (text)
- `created_at` (timestamp)

### 3.7 Employee Management

#### employee_shifts
- `id` (uuid, primary key)
- `employee_id` (uuid, references profiles)
- `clock_in` (timestamp)
- `clock_out` (timestamp)
- `hours_worked` (numeric, calculated)
- `notes` (text)
- `created_at` (timestamp)

### 3.8 Financial Management

#### weekly_balances
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles)
- `week_start_date` (date)
- `week_end_date` (date)
- `orders_total` (numeric)
- `franchise_fee` (numeric)
- `commissary_rent` (numeric)
- `old_balance` (numeric)
- `total_balance` (numeric, calculated)
- `amount_paid` (numeric)
- `remaining_balance` (numeric, calculated)
- `payment_status` (text: unpaid, partial, paid_full)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### weekly_balance_history
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles)
- `week_start_date` (date)
- `week_end_date` (date)
- `orders_total` (numeric)
- `franchise_fee` (numeric)
- `commissary_rent` (numeric)
- `old_balance` (numeric)
- `total_balance` (numeric)
- `amount_paid` (numeric)
- `remaining_balance` (numeric)
- `payment_status` (text)
- `rolled_over_at` (timestamp)
- `created_at` (timestamp)

#### cart_ownership
- `id` (uuid, primary key)
- `owner_id` (uuid, references profiles)
- `customer_id` (uuid, references profiles)
- `assigned_at` (timestamp)
- `created_at` (timestamp)

### 3.9 System Configuration

#### app_settings
- `id` (uuid, primary key)
- `key` (text, unique)
- `value` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Common settings:
- `service_fee` (numeric)
- `franchise_fee` (numeric)
- `commissary_rent` (numeric)

#### system_settings
- `key` (text, primary key)
- `value` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Settings include:
- `supabase_url`
- `supabase_anon_key`
- `sms_trigger_secret`

#### company_logos
- `id` (uuid, primary key)
- `name` (text)
- `logo_url` (text)
- `is_active` (boolean)
- `created_by` (uuid)
- `created_at` (timestamp)

#### login_backgrounds
- `id` (uuid, primary key)
- `name` (text)
- `image_url` (text)
- `quality` (integer, default: 80)
- `is_active` (boolean)
- `created_by` (uuid)
- `created_at` (timestamp)

#### themes
- `id` (uuid, primary key)
- `name` (text)
- `is_system` (boolean)
- `created_by` (uuid)
- `created_at` (timestamp)

#### receipt_templates
- `id` (uuid, primary key)
- `name` (text)
- `header_text` (text)
- `footer_text` (text)
- `paper_width` (integer, default: 80mm)
- `show_logo` (boolean)
- `show_company_info` (boolean)
- `show_barcode` (boolean)
- `is_default` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3.10 Notifications & Communication

#### notifications
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `order_id` (uuid, references orders)
- `type` (text: new_order, order_complete, low_stock, order_assigned)
- `message` (text)
- `read` (boolean)
- `created_at` (timestamp)

#### sms_rate_limit
- `id` (uuid, primary key)
- `phone_number` (text)
- `message_type` (text)
- `order_id` (uuid)
- `sent_at` (timestamp)

#### user_dismissed_announcements
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `announcement_id` (uuid)
- `dismissed_at` (timestamp)

### 3.11 AI Chat (Optional Feature)

#### chat_conversations
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `title` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### chat_messages
- `id` (uuid, primary key)
- `conversation_id` (uuid, references chat_conversations)
- `role` (text: user, assistant)
- `content` (text)
- `created_at` (timestamp)

### 3.12 Archive Tables

#### weekly_summary_snapshots
- `id` (uuid, primary key)
- `snapshot_date` (timestamp)
- `week_start_date` (date)
- `week_end_date` (date)
- `summary_data` (jsonb)
- `notes` (text)
- `created_by` (uuid)
- `created_at` (timestamp)

---

## 4. Storage Buckets

### product-images
- **Public**: Yes
- **Purpose**: Store product images
- **File types**: Images (jpg, png, webp)

### branding
- **Public**: Yes
- **Purpose**: Store company logos and login backgrounds
- **File types**: Images

### violation-images
- **Public**: No
- **Purpose**: Store violation evidence photos
- **File types**: Images
- **Access**: RLS controlled

---

## 5. Edge Functions (Backend APIs)

### 5.1 AI Functions

#### `/functions/v1/ai-chatbot`
- **Purpose**: AI chatbot for customer support
- **Method**: POST
- **Input**: `{ conversationId, message }`
- **Output**: AI response

#### `/functions/v1/ai-search`
- **Purpose**: Intelligent product/order search
- **Method**: POST
- **Input**: `{ query, type }`
- **Output**: Relevant results

#### `/functions/v1/ai-translate`
- **Purpose**: Multi-language support
- **Method**: POST
- **Input**: `{ text, targetLanguage }`
- **Output**: Translated text

#### `/functions/v1/analyze-image`
- **Purpose**: Image analysis for violations
- **Method**: POST
- **Input**: `{ imageUrl, prompt }`
- **Output**: Analysis results

#### `/functions/v1/product-recommendations`
- **Purpose**: AI-powered product suggestions
- **Method**: POST
- **Input**: `{ customerId }`
- **Output**: Recommended products

#### `/functions/v1/generate-content`
- **Purpose**: Generate product descriptions
- **Method**: POST
- **Input**: `{ prompt }`
- **Output**: Generated content

### 5.2 Utility Functions

#### `/functions/v1/send-sms`
- **Purpose**: Send individual SMS
- **Method**: POST
- **Input**: `{ to, message }`
- **Requires**: Twilio credentials
- **Security**: Trigger secret required

#### `/functions/v1/send-bulk-sms`
- **Purpose**: Send bulk SMS to customers
- **Method**: POST
- **Input**: `{ recipients[], message }`
- **Requires**: Twilio credentials

#### `/functions/v1/get-mapbox-token`
- **Purpose**: Retrieve Mapbox access token
- **Method**: GET
- **Output**: Token for map rendering

#### `/functions/v1/delete-user`
- **Purpose**: Delete user account (admin only)
- **Method**: POST
- **Input**: `{ userId }`
- **Requires**: Service role key

---

## 6. Key Business Logic

### 6.1 Order Processing Flow
1. Customer adds products to cart (adjusts by box size)
2. Customer submits order (status: pending)
3. System calculates total (items + service fee)
4. Triggers sent to notify staff
5. Worker assigns order to themselves
6. Worker processes order (status: processing)
7. Worker completes order (status: completed)
8. Triggers update customer balance and send notification
9. SMS sent to customer (if phone configured)

### 6.2 Price Calculation
- Base product price from `products.price`
- Box size multipliers:
  - `1 box` = 1.0x
  - `1/2 box` = 0.5x
  - `1/4 box` = 0.25x
- Server-side validation ensures prices can't be manipulated
- Service fee added at checkout (from `app_settings`)

### 6.3 Weekly Balance Calculation
- Week runs Monday 00:00 to Sunday 12:00 noon
- Automatic calculation on order completion:
  - `orders_total` = sum of completed orders
  - `franchise_fee` = from app_settings
  - `commissary_rent` = from app_settings
  - `total_balance` = orders_total + franchise_fee + commissary_rent + old_balance
  - `remaining_balance` = total_balance - amount_paid
- Unpaid balances roll over to next week
- History preserved in `weekly_balance_history`

### 6.4 Inventory Management
- Stock decrements on order completion
- Low stock alerts when `quantity <= low_stock_threshold`
- Purchase orders can replenish stock
- Stock takes track discrepancies

### 6.5 GPS Tracking
- Mobile app tracking: Drivers run `MobileGPSTracker` component
- Location updates every 30 seconds (configurable)
- Historical data stored in `location_history`
- Geofence alerts triggered on entry/exit

### 6.6 RLS (Row Level Security)
All tables have RLS policies enforcing:
- Customers see only their own data
- Workers see assigned data
- Managers see all operational data
- Admins have full access
- Owners see assigned customers' data

---

## 7. Real-time Features

### 7.1 Notifications
- Order status changes
- Low stock alerts
- GPS alerts
- New order notifications

### 7.2 Live Updates
- Order status updates
- Inventory changes
- GPS location tracking

---

## 8. Integrations

### 8.1 Twilio SMS
- Order completion notifications
- Bulk messaging
- Rate limiting implemented

### 8.2 Mapbox
- Fleet tracking maps
- Geofencing visualization
- Route history

### 8.3 Star Printer (TSP143IV-UE)
- WebPRNT protocol
- Receipt printing
- Template system

### 8.4 AI Models
- Google Gemini models
- OpenAI GPT models
- Integrated via backend functions

---

## 9. Security Features

### 9.1 Authentication
- Email/password authentication
- Session persistence
- Auto token refresh
- Password reset via email

### 9.2 Authorization
- Role-based access control (RBAC)
- Row-level security on all tables
- Function-level permissions
- Audit logging for role changes

### 9.3 Data Protection
- Phone number validation (E.164 format)
- Price validation (server-side)
- SQL injection prevention
- XSS protection

### 9.4 Rate Limiting
- SMS rate limiting per user
- Role change rate limiting
- API request throttling

---

## 10. UI/UX Requirements

### 10.1 Design System
- **Color Scheme**: Defined in design tokens
- **Typography**: System-ui font stack
- **Spacing**: Consistent scale
- **Components**: shadcn/ui based
- **Responsive**: Mobile-first design
- **Dark Mode**: Supported

### 10.2 Key UI Components
- Navigation bar with role-based menu items
- Notification bell with unread count
- AI chatbot widget
- Announcement bar
- Toast notifications (success, error, info)
- Modal dialogs
- Data tables with sorting/filtering
- Charts and analytics visualizations
- Image upload with preview
- Barcode scanner interface
- Map components (Mapbox GL)

### 10.3 Mobile Considerations
- Touch-friendly button sizes
- Bottom navigation for mobile
- Swipe gestures
- Pull to refresh
- Offline capability for critical features
- Background GPS tracking
- Camera access for barcode/photos

---

## 11. Localization (i18n)

### Supported Languages
- English (en)
- Arabic (ar)

### Translation Files
All UI strings should be translatable with RTL support for Arabic

---

## 12. API Integration Details

### Base URL
`https://jscmqiktfesaggpdeegk.supabase.co`

### Authentication Header
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzY21xaWt0ZmVzYWdncGRlZWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODk0ODAsImV4cCI6MjA3NTg2NTQ4MH0.Q8U91YGTWuW8n8f_biyLnTj6Km3IxhYndo6JWBfAzsM
```

### REST API Endpoints
- `/rest/v1/[table_name]` - CRUD operations
- Query parameters: `select`, `filter`, `order`, `limit`, `offset`
- Use PostgREST syntax

### Realtime Subscriptions
- Subscribe to table changes
- Websocket-based
- Requires authentication

---

## 13. Development Tools & Libraries

### Recommended for Native
- **React Native** with TypeScript
- **Supabase JS Client** for API integration
- **React Navigation** for routing
- **React Native Maps** for GPS
- **React Native Camera** for scanning
- **AsyncStorage** for local data
- **React Native Background Geolocation** for GPS tracking
- **Push Notifications** library

---

## 14. Testing Requirements

### Critical User Flows to Test
1. User registration and login
2. Product browsing and ordering (all roles)
3. Order processing workflow
4. Inventory management and stock takes
5. GPS tracking and geofencing
6. Weekly balance calculations
7. SMS notifications
8. Receipt printing
9. Role switching and permissions
10. Offline functionality

### Edge Cases
- Network failures during order submission
- GPS accuracy issues
- Concurrent order editing
- Stock going negative
- Invalid phone numbers
- Missing customer data in violations

---

## 15. Performance Requirements

- **Page Load**: < 2 seconds
- **GPS Update**: Every 30 seconds
- **Order Submission**: < 3 seconds
- **Image Upload**: < 5 seconds for 5MB file
- **Map Rendering**: < 1 second
- **API Response**: < 500ms average

---

## 16. Deployment Notes

### Native App Deployment
- **iOS**: Apple App Store (TestFlight for beta)
- **Android**: Google Play Store (Internal testing track)
- **Code Signing**: Required for both platforms
- **Backend**: Same backend instance
- **API Keys**: Share with web app

---

## 17. Support & Maintenance

### Monitoring Required
- Order completion rates
- SMS delivery rates
- GPS tracking accuracy
- API error rates
- User session metrics

### Regular Maintenance
- Weekly balance rollovers (automated)
- SMS log cleanup (automated)
- Database backups
- Security updates

---

## Appendix A: Database Functions

Key database functions that native app should be aware of:
- `has_role(user_id, role)` - Check user role
- `get_user_cart_number(user_id)` - Get cart number
- `is_owner_of_customer(owner_id, customer_id)` - Check ownership
- `recalculate_order_total()` - Order total calculation
- `update_weekly_balance()` - Balance calculation
- `rollover_unpaid_balance()` - Balance rollover
- `create_notification()` - Create notifications
- `handle_new_user()` - User signup trigger

---

## Appendix B: Enums

### app_role
- customer
- worker
- manager
- admin
- super_admin
- owner

### order_status
- pending
- processing
- completed

### violation_severity
- low
- medium
- high
- critical

### notification_type
- new_order
- order_complete
- low_stock
- order_assigned

### payment_status
- unpaid
- partial
- paid_full

---

**Document Version**: 1.0  
**Generated for**: Native App Development

This documentation provides complete specifications for building a native mobile app with identical functionality to the web application.