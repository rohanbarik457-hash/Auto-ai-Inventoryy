# AutoInventory AI - Frontend System

Production-grade AI-powered inventory and supply chain management system frontend with integrated chatbot, built as a comprehensive monorepo.

## 🎯 Core Features

### Inventory Management
- Real-time inventory tracking and updates
- Demand forecasting with ML models (LSTM, XGBoost, Prophet)
- Reorder point optimization with safety stock calculation
- Supplier lead-time analysis and reliability scoring
- Cash flow insights and working capital optimization

### AI Chatbot Integration
- Natural language understanding with intent detection
- Multi-turn conversation support
- Voice input/output (ASR + TTS with Whisper & Llama)
- Real-time inventory queries and order placement
- Contextual help and guided workflows

### Pain Point-Driven Dashboard
- Stockout risk visualization with heatmaps
- Overstocking analysis and recommendations
- Lead time reliability scoring
- Cash flow impact metrics and optimization
- Seasonal demand forecasting with decomposition

### Voice-First Interface
- Hands-free ordering for warehouse staff
- Natural language command processing
- Real-time transcription and intent parsing
- Voice response feedback

### Sector-Specific Customization
- **Retail:** Shelf space, markdown optimization, seasonal rotations
- **Food & Beverage:** Perishability, daily patterns, freshness scores
- **Manufacturing:** BOM tracking, batch optimization
- **Pharmacy:** Shelf-life, regulatory compliance

## Folder Structure

```
src/
├── pages/
│   ├── onboarding/
│   │   ├── Welcome.tsx              # First touch - brand promise
│   │   ├── BusinessInfo.tsx         # Business type, size, products
│   │   ├── PainPointDiscovery.tsx   # Multi-choice pain points
│   │   ├── SupplyChainMap.tsx       # Map suppliers, warehouses, stores
│   │   ├── DataImport.tsx           # Historical sales/PO upload
│   │   └── SetupComplete.tsx        # Confirmation & next steps
│   │
│   ├── dashboard/
│   │   ├── DashboardHome.tsx        # Main hub (role-based)
│   │   ├── InventoryOverview.tsx    # Real-time inventory status
│   │   ├── DemandForecasting.tsx    # Visual demand trends
│   │   ├── ReorderOptimizer.tsx     # Reorder suggestions & calculator
│   │   ├── SupplierAnalysis.tsx     # Lead time insights
│   │   ├── CashFlowInsights.tsx     # Working capital impact
│   │   └── Reports.tsx              # Analytics & KPIs
│   │
│   ├── settings/
│   │   ├── Profile.tsx              # User/business profile
│   │   ├── Integrations.tsx         # API keys, webhooks
│   │   ├── VoiceSetup.tsx           # ASR/LLM config & testing
│   │   └── DataManagement.tsx       # Export, delete, privacy
│   │
│   └── voice/
│       ├── VoiceConsole.tsx         # Live voice interaction
│       └── CommandLibrary.tsx       # Saved/suggested commands
│
├── components/
│   ├── shared/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Layout.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── discovery/
│   │   ├── PainPointCard.tsx        # Clickable pain point with icon
│   │   ├── PainPointSummary.tsx     # Overview of selected issues
│   │   ├── SupplierForm.tsx         # Add/edit supplier
│   │   ├── ProductCategoryPicker.tsx # Category selection
│   │   └── DataImportWizard.tsx     # CSV upload with preview
│   │
│   ├── dashboard/
│   │   ├── InventoryMetrics.tsx     # KPI cards (stockouts, turnover)
│   │   ├── DemandChart.tsx          # Time-series chart
│   │   ├── ReorderCard.tsx          # Reorder suggestion card
│   │   ├── SafetyStockExplainer.tsx # Educational modal
│   │   ├── LeadTimeDistribution.tsx # Supplier lead-time viz
│   │   ├── WorkingCapitalMeter.tsx  # Cash flow impact gauge
│   │   ├── StockoutRiskMatrix.tsx   # Risk heat map
│   │   └── SKUPerformance.tsx       # Product-level deep dive
│   │
│   ├── voice/
│   │   ├── VoiceRecorder.tsx        # Record & visualize audio
│   │   ├── CommandParser.tsx        # Display parsed intent & slots
│   │   ├── ActionConfirm.tsx        # Confirm action (e.g., create PO)
│   │   └── CommandHistory.tsx       # Log of past voice actions
│   │
│   └── charts/
│       ├── LineChart.tsx
│       ├── BarChart.tsx
│       ├── HeatMap.tsx
│       └── GaugeChart.tsx
│
├── hooks/
│   ├── useOnboarding.ts             # Manage onboarding state
│   ├── useDashboard.ts              # Fetch & cache dashboard data
│   ├── useForecast.ts               # Forecast API calls
│   ├── useVoice.ts                  # Voice recording & streaming
│   └── useLocalStorage.ts           # Persist user prefs
│
├── services/
│   ├── api. ts                       # Axios/fetch config
│   ├── auth.ts                      # Login/session
│   ├── inventory.ts                 # SKU & stock endpoints
│   ├── forecast.ts                  # Demand & lead-time predictions
│   ├── voice.ts                     # ASR & LLM intent parsing
│   ├── suppliers.ts                 # Supplier CRUD
│   └── export.ts                    # Data download/reports
│
├── context/
│   ├── AuthContext.tsx              # User & session state
│   ├── BusinessContext.tsx          # Business profile & settings
│   ├── PainPointContext.tsx         # Discovered pain points
│   └── UIContext.tsx                # Theme, language, notifications
│
├── constants/
│   ├── painPoints.ts                # Pain point taxonomy
│   ├── sectors.ts                   # MSME sectors & templates
│   ├── messages.ts                  # Copy & microcopy
│   └── config.ts                    # Feature flags, API URLs
│
├── styles/
│   ├── globals.css
│   ├── tailwind.css
│   └── animations.css
│
├── utils/
│   ├── validators.ts                # Form validation
│   ├── formatters.ts                # Number, date, currency formatting
│   ├── analytics.ts                 # Track user actions
│   └── errors.ts                    # Error handling & display
│
└── types/
    ├── index. ts                     # Shared TypeScript types
    ├── api.ts                       # API request/response types
    ├── business.ts                  # Business domain types
    └── voice.ts                     # Voice interaction types
```

## 🚀 Quick Start

### Prerequisites
- Node. js 18+
- npm 9+ or pnpm 8+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/GeekySquid/auto-inventory-ai-frontend.git
cd auto-inventory-ai-frontend

# Install dependencies
npm install

# Setup environment
cp apps/web/. env.example apps/web/.env. local
```

### Development

```bash
# Start all development servers
npm run dev

# Start specific app
npm run dev -- --filter=@auto-inventory-ai/web

# Run tests
npm run test

# Type checking
npm run type-check

# Formatting
npm run format

# Linting
npm run lint
```

### URLs
- **Frontend:** http://localhost:3000
- **Storybook:** http://localhost:6006

## 📚 Documentation

- [System Architecture](./docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Chatbot Integration](./docs/chatbot/ARCHITECTURE.md)
- [API Integration Guide](./docs/api/API_INTEGRATION.md)
- [Development Setup](./docs/development/SETUP.md)
- [Component Library](./docs/development/COMPONENTS.md)
- [Testing Guide](./docs/development/TESTING.md)

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety

### State Management
- **Zustand** - Lightweight state store
- **TanStack Query** - Server state management
- **Context API** - Contextual state

### Styling & UI
- **Tailwind CSS** - Utility-first CSS
- **Shadcn/ui** - Component library
- **CSS Modules** - Scoped styling

### Chatbot & Voice
- **Web Audio API** - Voice input/output
- **Whisper** - Speech-to-text
- **Llama** - LLM for intent parsing
- **TTS** - Text-to-speech synthesis

### Data Visualization
- **Recharts** - React charts
- **D3.js** - Advanced visualizations
- **Mapbox GL** - Supply chain mapping

### Testing
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Cypress** - E2E testing
- **Jest** - Snapshot testing

### Development Tools
- **Turbo** - Monorepo management
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Storybook** - Component documentation

## 📊 Performance Targets

- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Time to Interactive (TTI):** < 3.5s
- **Lighthouse Score:** > 90

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test: e2e
```

## 🐳 Docker

```bash
# Build image
docker build -f docker/Dockerfile. prod -t auto-inventory-ai-frontend . 

# Run container
docker run -p 3000:3000 auto-inventory-ai-frontend
```

## ☁️ Cloud Deployment

### Google Cloud Run
```bash
gcloud run deploy auto-inventory-ai-frontend \
  --source .  \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## 📈 Key Metrics & Analytics

### User Engagement
- Onboarding completion rate
- Feature adoption per pain point
- Voice interface usage frequency
- Dashboard engagement metrics

### Business Impact
- Stockout reduction (%)
- Inventory turnover improvement
- Working capital freed up ($)
- Forecast accuracy (MAPE, RMSE)

### Technical Health
- API latency (p50, p95, p99)
- Error rates & types
- Voice command success rate
- Core Web Vitals scores

## 🤝 Contributing

1. Create feature branch:  `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Run tests: `npm run test`
4. Format code: `npm run format`
5. Push:  `git push origin feature/my-feature`
6. Open Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/GeekySquid/auto-inventory-ai-frontend/issues)
- **Discussions:** [GitHub Discussions](https://github.com/GeekySquid/auto-inventory-ai-frontend/discussions)
- **Email:** support@autoinventory.ai

---

**Built with ❤️ for MSMEs by GeekySquid**
