# 📦 Logistics 🚢

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](DOCKER.md)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)

**Target-Logistics** is a high-performance, multi-carrier shipment tracking and management system. Designed for scalability and ease of deployment, it streamlines logistics workflows for businesses of all sizes.

---

## ✨ Features

- 🚚 **Multi-Carrier Support**: Native integration with [DHL Express API](https://developer.dhl.com/).
- 🗺️ **Real-time Tracking**: Interactive maps powered by Google Maps API.
- 🐳 **Dockerized**: One-command deployment with Docker Compose.
- 🔒 **Secure**: JWT-based authentication and security-first architecture.
- 📱 **Responsive**: Modern React frontend optimized for all devices.
- 📊 **Automated Invoices**: Generate professional invoices and shipping labels.

---

## 🚀 Quick Start (Docker)

Get up and running in under 2 minutes:

1. **Clone the repository**
   ```bash
   git clone https://github.com/jbloushi/my-project.git
   cd my-project
   ```

2. **Configure Environment**
   ```bash
   cp .env.docker.example .env
   # Edit .env with your keys (optional for basic test)
   ```

3. **Launch**
   ```bash
   docker-compose up -d
   ```

🔗 Access the API at: `http://localhost:8899/api`
🔗 Access the Health Check: `http://localhost:8899/health`

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, TailwindCSS |
| **Backend** | Node.js, Express |
| **Database** | MongoDB |
| **DevOps** | Docker, Docker Compose, PM2 |
| **API** | DHL Express API, Google Maps API |

---

## 📖 Documentation

- 🐳 [**Docker Guide**](DOCKER.md) - Deep dive into container management.
- 🚀 [**VPS Deployment**](DEPLOYMENT.md) - Manual deployment guide for Linux servers.
- ⚙️ [**Configuration**](CONFIGURATION_GUIDE.md) - Detailed environment variable reference.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ by [jbloushi](https://github.com/jbloushi)**
