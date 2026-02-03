# Target Logistics - Configuration Guide

## Backend Configuration (`.env`)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/shipment-tracker
JWT_SECRET=your_jwt_secret_key

# DHL Express API
DHL_API_KEY=apA9dM9fX0dR2r
DHL_API_SECRET=S!7qH!4iM@3mP^4l

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Frontend Configuration (`.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## DHL Express API

The application uses DHL Express MyDHL API for:
- Rate quotes (`/rates`)
- Shipment creation with label/AWB generation (`/shipments`)
- Tracking (`/tracking`)

### Required Fields for Shipment Creation
- `plannedShippingDateAndTime`
- `productCode` (e.g., 'P' for Express Worldwide)
- `customerDetails.shipperDetails` (address + contact)
- `customerDetails.receiverDetails` (address + contact)
- `content.packages[]` (weight, dimensions)
- `content.declaredValue` (for international)
- `content.exportDeclaration.lineItems[]` (for customs)

## Running the Application

### Start Backend
```bash
cd backend
npm install
npm run dev
```

### Start Frontend
```bash
cd frontend
npm install
npm start
```

### Run API Tests
```bash
cd backend
node comprehensive-api-test.js
```
