# Software Requirements Specification (SRS)  
## Project: **Hanuman Traders – AutoInventory AI**  
**Version:** 1.0  
**Date:** 2025-12-17  
**Prepared For:** Hanuman Traders (MSME Sector)

---

## 1. Introduction

### 1.1 Purpose
The purpose of **AutoInventory AI** is to provide a comprehensive, intelligent, and scalable inventory management solution tailored for **Micro, Small, and Medium Enterprises (MSMEs)**.  
It aims to:
- Digitize manual inventory processes  
- Optimize stock levels using AI-driven analytics  
- Ensure **GST compliance**  
- Deliver actionable business insights for better decision-making  

---

### 1.2 Scope
The system covers the **entire supply chain lifecycle** within a retail or warehouse environment:

- **Inventory Management:**  
  Real-time stock tracking, categorization, and expiration monitoring  

- **Sales & POS:**  
  Fast billing, invoicing, and customer management  

- **Procurement:**  
  Supplier relationship management and automated reordering  

- **Analytics:**  
  Demand forecasting, sales trends, and financial reporting  

- **Administration:**  
  Role-Based Access Control (RBAC) and multi-location support  

- **AI Integration:**  
  Natural language querying and automated decision support  

---

## 2. Technical Architecture

### 2.1 Technology Stack

**Frontend**
- React (TypeScript)
- Vite
- Tailwind CSS
- Lucide React (Icons)
- Recharts (Data Visualization)

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB (Primary Data Store)

**Authentication & Security**
- JWT (JSON Web Tokens)
- Bcrypt password encryption

**AI / Analytics**
- Custom TypeScript-based Analytics Engine  
  - Forecasting  
  - Clustering  
  - Growth Analysis  

---

### 2.2 System Design
The application follows a **Monolithic Client–Server Architecture** with strict separation of concerns:

- **Presentation Layer**
  - Responsive React UI
  - Dark mode support

- **Business Logic Layer**
  - Express controllers
  - Input validation
  - RBAC enforcement
  - Core business rules

- **Data Access Layer**
  - Mongoose ODM
  - Schema validation
  - Database abstraction

- **Security**
  - Stateless JWT authentication
  - Protected API routes
  - Granular permission checks

---

## 3. Functional Requirements (Module Analysis)

### 3.1 Inventory Management  
**(`Inventory.tsx`)**

- **Real-time Tracking**
  - Monitor stock levels across multiple warehouses/stores  

- **Strict Categorization**
  - Automatic classification into:
    - Expiring Soon
    - Low Stock
    - Dead Stock  
  - Centralized predicate-based logic  

- **Data Portability**
  - Import: Excel / CSV  
  - Export: Excel / CSV / JSON / XML  
  - Zero data loss guarantee  

- **Visual Indicators**
  - Confidence badges:
    - “Expiring”
    - “Slow Moving”
    - “Dead Stock”  

---

### 3.2 Analytics & AI  
**(`Analytics.tsx`, `AIAgent.tsx`)**

- **Demand Forecasting**
  - Predict future sales using historical data  

- **Growth Analysis**
  - Product categorization:
    - High Growth
    - Stable
    - Declining  

- **Interactive Dashboard**
  - Bar charts
  - Line graphs
  - Pie charts  
  - Metrics:
    - Revenue
    - Top-selling products
    - Category-wise performance  

- **AI Assistant**
  - Natural language queries  
  - Example:
    > “Show me top selling items this week”

---

### 3.3 Sales & Billing  
**(`Sales.tsx`, `GSTReport.tsx`)**

- **Point of Sale (POS)**
  - Fast and intuitive billing interface  

- **GST Compliance**
  - Automated CGST / SGST calculation
  - Product-based tax slabs  

- **Invoicing**
  - Professional printable invoices  

- **Tax Reporting**
  - Dedicated GST reports for filing  

---

### 3.4 User & Role Management  
**(`Users.tsx`, `Login.tsx`)**

- **Role-Based Access Control (RBAC)**
  - Super Admin
  - Warehouse Owner
  - Warehouse Manager  
  - Customizable permissions  

- **Security**
  - Secure login
  - Protected APIs  

- **Audit Logs**
  - Track user actions:
    - Sales
    - Stock updates
    - Configuration changes  

---

### 3.5 Stakeholder Management  
**(`Customers.tsx`, `Suppliers.tsx`)**

- **Customer Relationship Management (CRM)**
  - Purchase history
  - Loyalty points  

- **Supplier Relationship Management (SRM)**
  - Supplier profiles
  - Lead times
  - Performance ratings  

---

### 3.6 Multi-Location Support

- **Tenant Isolation**
  - Multiple independent business tenants  

- **Location Management**
  - Manage multiple warehouses and retail outlets under one tenant  

---

## 4. MSME Benefit Analysis

### 4.1 Cost Reduction

- **Dead Stock Minimization**
  - Identify non-performing inventory
  - Enable clearance sales before capital loss  

- **Waste Reduction**
  - “Expiring Soon” alerts
  - Prevent spoilage in grocery/pharma businesses  

---

### 4.2 Operational Efficiency

- **Automation**
  - GST calculation
  - Reorder point recommendations
  - Reduced dependency on accountants  

- **Unified View**
  - Central dashboard replaces manual report compilation  

---

### 4.3 Scalability

- **Multi-Branch Ready**
  - Seamless expansion from single store to multi-branch chain  

- **Cloud-Ready Stack**
  - MongoDB + Node.js
  - Easily deployable on AWS / Azure  

---

### 4.4 Decision Support

- **Data-Driven Decisions**
  - Forecast-based ordering
  - Reduced stockouts and overstocking  

- **Professional Brand Image**
  - Digital invoices
  - Loyalty programs
  - Enterprise-grade appearance for MSMEs  

---

## 5. Research & Future Scope

### 5.1 Advanced Forecasting Models

- **Current**
  - Linear projection
  - Moving averages  

- **Future**
  - ARIMA
  - Facebook Prophet  
  - Seasonal demand handling (festivals, regional spikes)  

---

### 5.2 Supply Chain Transparency

- **Supplier Integration**
  - Automated Purchase Order (PO) generation
  - API-based supplier connectivity  

- **Tracking Enhancements**
  - QR code / Barcode scanning
  - Mobile-based stock intake  

---

### 5.3 Offline-First Capabilities

- **Challenge**
  - Intermittent internet connectivity for Indian MSMEs  

- **Solution**
  - Progressive Web App (PWA)
  - IndexedDB for offline storage
  - Auto-sync on connectivity restoration  

---

### 5.4 Hyper-local Marketing

- **Concept**
  - Location-based offers
  - Purchase-history-driven campaigns  

- **Channels**
  - WhatsApp
  - SMS  
  - Example:
    > “50% off on Rice bags near you”

---

## Conclusion
**AutoInventory AI** is not just a digital ledger—it is a **strategic business asset** for **Hanuman Traders**.  
By combining **strict inventory control**, **AI-driven analytics**, and **GST-compliant operations**, the system transforms the warehouse from a **cost center** into a **profit-optimized engine**.

---
