# HalalChain MVP - Complete Deployment Guide

## 🎯 Overview

This guide will help you:
1. Run tests on your smart contracts
2. Deploy contracts to BSC Testnet
3. Run the frontend to test all functionality

---

## 📦 Part 1: Smart Contract Testing & Deployment

### Prerequisites
- Node.js 18+ installed
- BSC Testnet BNB in your wallet
- Private key ready

### Step 1: Test the Contracts

\`\`\`bash
cd halalchain-mvp

# Install dependencies if not done
npm install

# Run all tests
npx hardhat test
\`\`\`

**Expected Result**: You should see around 45-50 tests passing. The contracts include:
- ✅ AccessControlManager (Role-based permissions)
- ✅ OracleHub (Price feeds with Gharar prevention)
- ✅ ShariaRegistry (Fatwa & compliance system)
- ✅ HalalToken (Governance token with voting)
- ✅ HalGoldStablecoin (100% gold-backed)
- ✅ MudarabahVault (Profit-sharing vault)
- ✅ MudarabahPool (ERC4626 compliant pool)
- ✅ SukukManager (Islamic bonds)
- ✅ Treasury (Protocol treasury)
- ✅ ZakatVault (Charity vault)
- ✅ HalalDAO (On-chain governance)

### Step 2: Configure Deployment

Create `.env` file:

\`\`\`bash
echo "PRIVATE_KEY=your_private_key_without_0x" > .env
echo "BSCSCAN_API_KEY=your_bscscan_api_key" >> .env
\`\`\`

### Step 3: Deploy to BSC Testnet

\`\`\`bash
# Deploy all contracts
npx hardhat run scripts/deploy.js --network bscTestnet
\`\`\`

**What Gets Deployed:**
1. Core Infrastructure
   - AccessControlManager
   - OracleHub
   - ShariaRegistry

2. Mock Oracles (for testnet)
   - Gold Reserve Feed (simulating 1000g)
   - Gold Price Feed (simulating $60/gram)

3. Tokens
   - HALAL Token (1 billion supply)
   - HAL-GOLD Stablecoin

4. Financial Products
   - MudarabahVault
   - MudarabahPool
   - SukukManager

5. Governance
   - Treasury
   - ZakatVault
   - TimelockController
   - HalalDAO

**Output**: Contract addresses will be saved to `deployed-addresses.json`

### Step 4: Verify Contracts (Optional)

\`\`\`bash
# Verify each contract on BSCScan
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]
\`\`\`

---

## 🌐 Part 2: Frontend Setup & Testing

### Step 1: Copy Contract Addresses

\`\`\`bash
cd ../halalchain-frontend

# Copy the deployed addresses
cp ../halalchain-mvp/deployed-addresses.json .
\`\`\`

### Step 2: Update Contract Addresses

Edit `lib/contracts.ts` and paste your deployed addresses:

\`\`\`typescript
export const CONTRACTS = {
  AccessControlManager: '0xYOUR_ADDRESS',
  HalalToken: '0xYOUR_ADDRESS',
  HalGoldStablecoin: '0xYOUR_ADDRESS',
  // ... etc
};
\`\`\`

### Step 3: Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Step 4: Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000 in your browser.

---

## 🧪 Part 3: Testing the Full System

### 1. Connect Your Wallet

1. Click "Connect Wallet" button
2. Select MetaMask (or your preferred wallet)
3. **Switch to BSC Testnet** (Chain ID: 97)
4. Get test BNB from: https://testnet.bnbchain.org/faucet-smart

### 2. Test Each Feature

#### 🪙 HALAL Token
- View your balance (should be 0 initially)
- Transfer tokens (deployer has 1 billion)
- Delegate voting power (to yourself or others)
- Check voting power

#### 🥇 HAL-GOLD Stablecoin
- View balance
- Mint tokens (requires OPERATOR_ROLE - granted to deployer)
- Test: Mint 10 HAL-GOLD to your address
- Check total supply

#### 💰 Mudarabah Vault
- Approve HAL-GOLD for vault
- Deposit HAL-GOLD
- View your shares
- Simulate profit (if you're owner)
- Withdraw with profit

#### 📜 Sukuk Manager
- List a new Sukuk project
- Enter IPFS hash (or fake hash for testing)
- Set target raise amount
- Set maturity date
- Submit project

#### 🤲 Zakat Vault
- Approve HAL-GOLD
- Donate to charity vault
- Fulfills Islamic obligation on-chain

#### 📋 Sharia Registry
- Check any contract address
- See if it's Sharia-compliant
- View Fatwa status

---

## 🔧 Troubleshooting

### "Insufficient funds for gas"
→ Get more test BNB from the faucet

### "Contract not found"
→ Make sure you updated addresses in `lib/contracts.ts`

### "Transaction reverted"
→ Check if you have the required role (OPERATOR_ROLE, etc.)

### "Wrong network"
→ Switch to BSC Testnet in your wallet

### "Module not found" errors in frontend
→ These are from node_modules, ignore for development
→ Use `npm run dev` instead of `npm run build`

---

## 📊 Contract Status Summary

After deployment, you'll have:

### Core System (3 contracts)
- ✅ Access control with 5 roles
- ✅ Oracle hub with staleness checks
- ✅ Sharia registry with Fatwa system

### Tokens (2 contracts)
- ✅ 1 billion HALAL governance tokens
- ✅ HAL-GOLD stablecoin (mintable with reserves)

### DeFi Products (3 contracts)
- ✅ Mudarabah vault (profit sharing)
- ✅ Mudarabah pool (ERC4626)
- ✅ Sukuk manager (Islamic bonds)

### Governance (4 contracts)
- ✅ Treasury for protocol funds
- ✅ Zakat vault for charity
- ✅ Timelock (2-day delay)
- ✅ DAO with on-chain voting

**Total: 12 Smart Contracts + 2 Mock Oracles**

---

## 🎨 Frontend Features

The DApp provides:

- **Wallet Connection**: RainbowKit with MetaMask, WalletConnect, etc.
- **Real-time Balances**: All your token balances update automatically
- **Transaction Status**: Loading states and confirmations
- **Dark Mode**: Automatic dark/light theme
- **Responsive**: Works on desktop and mobile
- **Type-Safe**: Full TypeScript support

---

## 🚀 Next Steps

### For Production:
1. Audit all smart contracts
2. Use real Chainlink oracles
3. Set up multi-sig for admin roles
4. Deploy TimelockController with DAO
5. Transfer ownership to DAO
6. Set up real gold custody
7. Register with regulatory bodies

### For Further Testing:
1. Test governance proposals
2. Test Sukuk lifecycle
3. Test profit distribution
4. Test access control
5. Test oracle updates
6. Test pause mechanisms

---

## 📝 Key Contract Addresses

After deployment, note these addresses:

- **AccessControlManager**: Manages all roles
- **HALAL Token**: Transfer this to test users
- **HalGoldStablecoin**: Main stablecoin
- **ShariaRegistry**: Check compliance here

---

## ⚠️ Important Security Notes

1. **Never share private keys**
2. **This is TESTNET only** - No real value
3. **Deployer has all roles** - In production, use multi-sig
4. **Oracles are MOCKED** - Production needs real Chainlink feeds
5. **No audit yet** - Don't use with real funds

---

## 📞 Support

If you encounter issues:
1. Check this guide carefully
2. Ensure you're on BSC Testnet
3. Verify contract addresses are correct
4. Check you have test BNB
5. Review transaction errors in MetaMask

---

## ✅ Success Checklist

- [ ] Contracts compiled successfully
- [ ] All tests passing
- [ ] Contracts deployed to testnet
- [ ] Addresses updated in frontend
- [ ] Wallet connected to BSC Testnet
- [ ] Test BNB acquired
- [ ] Successfully transferred HALAL tokens
- [ ] Successfully minted HAL-GOLD
- [ ] Successfully deposited to vault
- [ ] Successfully checked Sharia compliance

---

**Congratulations! Your HalalChain MVP is now fully operational!** 🎉

The system is ready for testing all Sharia-compliant DeFi features.



💰 Revenue Models
1. Transaction Fees (Most Common)
0.3-1% fee on every HAL-GOLD mint/redeem
0.1-0.5% fee on Sukuk investments
Small gas fee markup on all transactions
2. Management Fees
20% of Mudarabah vault profits (already built-in!)
2-5% annual management fee on Sukuk bonds
Performance fees on DeFi pools
3. Staking/Governance
Sell HALAL tokens to early investors/VCs
Users stake HALAL to access premium features
Governance participation requires holding HALAL
4. B2B Services
License the technology to Islamic banks
Charge businesses to list Sukuk bonds
White-label solution for other Halal DeFi projects
5. Treasury Growth
Hold 10-20% of HALAL token supply in Treasury
As token price increases, treasury value grows
Use treasury funds for operations
🎯 Quick Launch Strategy
Deploy to mainnet → List HALAL token on DEX
Initial DEX Offering (IDO) → Raise $50k-500k
Partner with Islamic organizations → Get real users
Launch gold custody → Start earning fees on HAL-GOLD
Scale → More fees = more revenue
Realistic Timeline:
Month 1-2: Deploy + Marketing = $0
Month 3-6: Early users + fees = $5k-20k/month
Year 1: Established platform = $50k-200k/month
Key: Focus on HAL-GOLD stablecoin fees - that's where the real money is! Every mint/redeem generates revenue.
