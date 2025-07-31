# Mata Trading POS Simulator

A comprehensive financial simulation tool for trading point-of-sale operations, built with React.js and deployed as a static website.

## 🌐 Live Demo

The application is deployed on Render as a static website and is mobile-friendly.

## 🚀 Features

### 📊 Main Simulation
- **Volume Management**: Configure base volume (default: 20,000,000)
- **Product Configuration**: Set purchase and sale prices for editable products
- **Margin Calculations**: Automatic margin calculations with abats (by-products) support
- **Benefit Distribution**: Real-time calculation of profit distribution across products
- **Visual Charts**: Interactive bar charts and pie charts for data visualization

### 📈 Volume Increase Simulation
- **Product Selection**: Choose which product to increase volume for
- **Volume Addition**: Add specific amounts to the base volume
- **Dynamic Repartition**: Automatic recalculation of product percentages while maintaining 100% total
- **Absolute Volume Preservation**: Other products maintain their absolute volumes while percentages adjust

### 💰 Charges Management
- **Fixed Setup Costs**: Configurable initial investment (default: 5,000,000)
- **Monthly Charges**: 
  - Salary: 250,000
  - Electricity: 25,000
  - Water: 5,000
  - Internet: 10,000
  - Delivery bags: 30,000
  - Transport charges: 150,000
- **Amortization**: Configurable amortization period for fixed costs (default: 24 months)
- **Total Cost Calculation**: Automatic calculation of total monthly charges

### 📊 DCF (Discounted Cash Flow) Analysis
- **DCF Simple**: Analysis based on original data
- **DCF Simulation**: Analysis based on volume simulation data
- **Financial Metrics**:
  - NPV (Net Present Value)
  - IRR (Internal Rate of Return) - monthly and annual
  - Profitability Index
  - Discounted Payback Period
- **Configurable Parameters**:
  - Annual discount rate (default: 12%)
  - Analysis duration (default: 60 months)

## 🔧 Technical Details

### DCF Calculation Behavior

**Why TRI (IRR) values are identical between DCF Simple and DCF Simulation:**

The Internal Rate of Return (TRI) values are the same because both DCF calculations use identical cash flow structures:

1. **Same Initial Investment**: Both use `-chargesFixes` (5,000,000)
2. **Same Monthly Charges**: Both use `chargesTotales` (same monthly operational costs)
3. **Only Difference**: Monthly benefit amount (`beneficeTotal` vs `beneficeTotalSimulation`)

**Mathematical Explanation:**
- TRI is the discount rate that makes NPV = 0
- Since both scenarios have identical investment and cost structures, they require the same return rate to break even
- The TRI represents the **required return rate**, not the actual profitability
- This is mathematically correct but may not reflect real-world scaling considerations

**Potential Improvements:**
To make the DCF simulation more realistic, consider adding:
1. **Additional investment costs** proportional to volume increase
2. **Additional operational costs** proportional to volume increase
3. **Economies of scale** effects

### Volume Simulation Logic

**Calculation Method:**
1. **Selected Product**: `new_volume = original_volume + additional_volume`
2. **Other Products**: `volume_unchanged = original_volume`
3. **New Repartitions**: `new_repartition = absolute_volume / total_new_volume`
4. **Total**: Always maintains 100% sum

**Example with 10,000,000 added to Chicken:**
- Base volume: 20,000,000
- Chicken original: 2,058,642 (10.29%)
- Chicken new: 12,058,642 (40.20%)
- Total new volume: 30,000,000
- Other products: Absolute volumes unchanged, percentages reduced proportionally

### Number Formatting

The application uses French locale formatting:
- **Thousands separator**: Space (e.g., `1 044 881.05`)
- **Decimal separator**: Comma (e.g., `1 044 881,05`)
- **Currency**: No currency symbol displayed

## 🛠️ Technology Stack

- **Frontend**: React.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Render (Static Site)
- **Version Control**: Git/GitHub

## 📱 Mobile Optimization

The application is fully responsive and optimized for mobile devices:
- Touch-friendly input controls
- Responsive grid layouts
- Optimized font sizes for mobile screens
- Collapsible sections for better mobile navigation

## 🔄 State Management

The application uses React's `useState` for state management with the following key states:
- Product data and repartitions
- Volume and simulation parameters
- Charge configurations
- DCF analysis parameters
- Active tab selection

## 📊 Data Flow

1. **Base Configuration**: Set volume, prices, and repartitions
2. **Simulation**: Add volume to selected product
3. **Recalculation**: Automatic adjustment of repartitions
4. **Charges**: Apply operational and fixed costs
5. **DCF Analysis**: Calculate financial metrics for both scenarios

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Build for production: `npm run build`

## 📝 License

This project is for educational and business analysis purposes.

## 🤝 Contributing

Feel free to submit issues and enhancement requests.

---

**Note**: The DCF simulation currently uses the same cost structure as the base scenario. For more realistic analysis, consider implementing additional costs proportional to volume increases. 