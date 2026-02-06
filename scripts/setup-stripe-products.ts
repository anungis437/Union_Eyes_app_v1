/**
 * Stripe Product Setup Script for UnionEyes
 * Creates subscription tiers and pricing for Canadian union management
 * 
 * Run: npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from "stripe";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in .env.local");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

interface ProductConfig {
  name: string;
  description: string;
  metadata: {
    tier: string;
    maxMembers: string;
    features: string;
  };
  prices: {
    monthly: number; // in cents
    yearly: number; // in cents
  };
}

const PRODUCTS: ProductConfig[] = [
  {
    name: "UnionEyes Starter",
    description: "Perfect for small unions getting started with digital transformation",
    metadata: {
      tier: "starter",
      maxMembers: "500",
      features: "claims,voting,mobile,voice-to-text"
    },
    prices: {
      monthly: 800, // $8/member/year = $0.67/member/month
      yearly: 8000 // $8/member/year
    }
  },
  {
    name: "UnionEyes Professional",
    description: "Complete solution with CBA Intelligence and analytics",
    metadata: {
      tier: "professional",
      maxMembers: "2000",
      features: "claims,voting,mobile,voice-to-text,cba-intelligence,analytics"
    },
    prices: {
      monthly: 1200, // $12/member/year = $1/member/month
      yearly: 12000 // $12/member/year
    }
  },
  {
    name: "UnionEyes Enterprise",
    description: "Full platform with regional standardization and custom integrations",
    metadata: {
      tier: "enterprise",
      maxMembers: "unlimited",
      features: "claims,voting,mobile,voice-to-text,cba-intelligence,analytics,regional-dashboard,integrations,white-label"
    },
    prices: {
      monthly: 1500, // $15/member/year = $1.25/member/month
      yearly: 15000 // $15/member/year
    }
  }
];

async function setupStripeProducts() {
  console.log("🚀 Setting up UnionEyes Stripe products...\n");

  for (const config of PRODUCTS) {
    try {
      // Create product
      console.log(`📦 Creating product: ${config.name}`);
      const product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: config.metadata,
        tax_code: "txcd_10000000", // Software as a Service
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create monthly price
      console.log(`💰 Creating monthly price...`);
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.prices.monthly,
        currency: "cad", // Canadian dollars
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        metadata: {
          tier: config.metadata.tier,
          billing_period: "monthly"
        }
      });

      console.log(`✅ Monthly price created: ${monthlyPrice.id} - $${config.prices.monthly / 100} CAD/month`);

      // Create yearly price
      console.log(`💰 Creating yearly price...`);
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.prices.yearly,
        currency: "cad",
        recurring: {
          interval: "year",
          interval_count: 1,
        },
        metadata: {
          tier: config.metadata.tier,
          billing_period: "yearly"
        }
      });

      console.log(`✅ Yearly price created: ${yearlyPrice.id} - $${config.prices.yearly / 100} CAD/year`);
      console.log(`---\n`);

    } catch (error) {
      console.error(`❌ Error creating ${config.name}:`, error);
    }
  }

  console.log("✅ Stripe product setup complete!\n");
  console.log("📋 Next steps:");
  console.log("1. Add price IDs to .env.local");
  console.log("2. Test checkout flow at http://localhost:3000/pricing");
  console.log("3. Set up webhook endpoint for subscription events");
}

// Run the setup
setupStripeProducts().catch(console.error);
