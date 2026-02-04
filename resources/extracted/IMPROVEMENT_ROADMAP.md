# Target Logistics - Page Improvement Roadmap

## Completed Pages ✅

1. **Dashboard (Main)** - dashboard-improved.html
   - Removed AI Logistics Insights
   - Added Coming Soon overlays for Financial Books and Revenue Analytics
   - Modern stat cards and clean layout

2. **Shipments Page** - shipment-dashboard.html  
   - Removed AI insights
   - Clean status overview
   - Modern table design

3. **User Management** - user-management.html
   - Modern table with avatars
   - Role-based color coding
   - Stats overview cards

4. **Address Book** - address-book.html
   - Clean empty state
   - Search functionality
   - Modern design matching other pages

## Pages To Create 🚀

Based on the uploaded images, here are the remaining pages needed:

### 5. Client Dashboard (Image 2)
- Shows Total Shipments: 2, Delivered: 0, Pending: 1, In Transit: 0
- AI Logistics Insights section (to be removed/replaced)
- Shipment Activity chart
- Net Revenue section
- Recent Shipments table

### 6. Organizations Management (Image 4)
- Table showing:
  - Global Trading Co. (client, 2 members, -30.000 KD balance)
  - Target Logistics Org (internal, 0 members, 1000.000 KD balance)
- Credit limit column
- Member management actions

### 7. Finance & Credits (Image 5)
- Available Balance card (prominent)
- Credit Limit card
- Total Purchasing Power card
- Transaction History table with:
  - Date & Time
  - Description (Shipment Fees)
  - Category (SHIPMENT FEE badge)
  - Amount
  - Balance

### 8. Settings - General & API (Image 6)
- Developer API Access section
  - API key generation
  - Quick start examples
  - Connection guide (Mapbox, Carrier API)
- Staff Operations Dashboard section

### 9. Settings - Default Shipper Profile (Image 8)
- Address Book link
- Form with:
  - Company Name
  - Trader Type dropdown
  - Tax ID/EIN
  - Contact Person
  - Country code + Phone
  - Email
  - Shipper Reference
  - VAT Numbers
  - Address fields (autocomplete)
  - Save button

### 10. Shipments - Empty State (Image 7)
- Status circles: All: 1, Pending: 1, others: 0
- Settings and Logout in top right
- Tabs: Active (0), Pending (2), Delivered (0), All Shipments (2)
- Empty state: "No Shipments Found"

### 11. Add New Address Modal (Image 9)
- Modal overlay design
- Address Details section:
  - Company Name
  - Trader Type
  - Contact Person
  - Phone with country code
  - Email
  - References and VAT
  - EORI Number
  - Address autocomplete
  - Full address fields
- Cancel and Save buttons

### 12. Create New Shipment - Step 1 (Image 10)
- Progress: Step 1 of 5
- Est: 5-8 min indicator
- Shipment Type dropdown
- Planned Ship Date
- Pickup Required toggle
- Two-column layout:
  - SHIPPER (From) - teal accent
  - RECEIVER (To) - purple accent
- Both sections with:
  - Company name
  - Trader type
  - Contact person
  - Phone/Email
  - References
  - VAT numbers
  - Address autocomplete
  - Full address fields
- Back and Continue buttons

### 13. Create New Shipment - Step 2 (Image 11)
- Progress: Step 2 of 5 (Content)
- Dangerous Goods Declaration section (red/warning style)
  - DG Type dropdown
  - UN ID, Service Code, Contact ID
  - Packing Group, Hazard Class
  - Proper Shipping Name
  - DG Marks & Instructions
- Physical Packages section
  - Packaging type dropdown
  - Parcel cards (expandable)
    - Description
    - Unit Weight, Length, Width, Height
    - Quantity
    - Calculated volumetric/actual/billable weight
  - Add Another Package button
- Customs Declaration (Items)
  - Item cards with:
    - Description, Quantity, Unit Value, Currency
    - Net Weight, HS Code, Origin
  - Add Another Item button

### 14. Create New Shipment - Step 3 (Image 12)
- Progress: Step 3 of 5 (Billing)
- Commercial Invoice Details
  - Reason for Export dropdown
  - Invoice Remarks
  - Signature Name/Title
- Duties, Taxes & Billing
  - Incoterm dropdown
  - Payer of VAT/GST
  - Shipper Account Number
  - GST/VAT already paid toggle
- Output & Operations
  - Label Format
  - Pallet Count
  - Package Marks
- Info notice about billing verification

### 15. Create New Shipment - Step 4 (Image 13)
- Progress: Step 4 of 5 (Review)
- Route & Parties section
  - FROM (Shipper): Global Trading Co., Kuwait City
  - TO (Receiver): DDD, Dubai
  - Phone/Email details
  - Reference numbers
- Content & Packages section
  - Package summary (1 Pieces, 5.00 KG Actual, 1.60 KG Volumetric)
  - Package details table
  - Customs declaration value
- Right sidebar:
  - ESTIMATED TOTAL (large, prominent)
  - DHL Express Worldwide
  - Billable Weight, Incoterm, DAP
  - Ready to Book checklist:
    - All Data Validated
    - Address Valid
    - Customs Data
    - DG Checked
  - Confirmation notice
  - Available Credit display
- FINALIZE & BOOK button

## Design System Requirements

All pages should follow:
- **Colors**: Teal primary (#00d9b8), Dark theme
- **Typography**: DM Sans (body), Outfit (headings)
- **Components**: Consistent buttons, cards, tables, badges
- **Animations**: Subtle hover effects, smooth transitions
- **Spacing**: 32px page padding, 20px card gaps
- **Border Radius**: 10-16px on cards/buttons

## Priority Order

1. ✅ Dashboard (completed)
2. ✅ Shipments (completed)  
3. ✅ User Management (completed)
4. ✅ Address Book (completed)
5. **Create New Shipment Flow** (Steps 1-4) - HIGH PRIORITY
6. Finance & Credits
7. Organizations
8. Settings pages
9. Client Dashboard variant

Would you like me to proceed with creating these pages systematically?
