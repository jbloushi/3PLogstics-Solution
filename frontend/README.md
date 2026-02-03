# Target Logistics - Frontend

A modern React application for shipment tracking with Google Maps integration.

## 🛠️ Technologies
- **React 18** - UI framework
- **Material UI** - Component library
- **Google Maps API** - Interactive maps
- **React Router** - Navigation

## 📱 Features

### Dashboard
- Tabbed navigation (Shipments, Saved Addresses, Parcel Templates)
- Role-based tabs (Client Management, User Management)
- Live stats cards (Total, Pending, In Transit, Delivered)

### Shipment Management
- Create shipments with DHL rate quotes
- Real-time tracking with Google Maps
- Download DHL labels and AWB documents (staff/admin)
- Public tracking link sharing

### Role-Based Access
| Feature | Admin | Staff | Client | Public |
|---------|-------|-------|--------|--------|
| Create Shipments | ✅ | ✅ | ✅ | ❌ |
| View All Shipments | ✅ | ✅ | Own only | ❌ |
| DHL Documents | ✅ | ✅ | ❌ | ❌ |
| Tracking History | ✅ | ✅ | ✅ | ✅ |
| Update Location | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

## 🔧 Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 🚀 Quick Start

```bash
npm install
npm start
```

The application runs at http://localhost:3000

## 📁 Project Structure

```
src/
├── components/
│   ├── GoogleMapComponent.js    # Single shipment map
│   ├── GoogleMapAll.js          # Dashboard overview map
│   ├── ShipmentDetails.js       # Shipment detail view
│   └── ShipmentList.js          # Shipment list with map
├── pages/
│   ├── DashboardPage.js         # Main dashboard
│   ├── HomePage.js              # Landing page
│   └── TrackingPage.js          # Public tracking
├── context/
│   ├── AuthContext.js           # Authentication state
│   └── ShipmentContext.js       # Shipment state
└── services/
    └── api.js                   # API client
```