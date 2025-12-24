import { db } from '../db';
import { sql } from 'drizzle-orm';

async function createMLTables() {
  console.log('🛠️  Creating ML tables...\n');

  try {
    // Create ml_predictions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL,
        prediction_type VARCHAR(50) NOT NULL,
        prediction_date DATE NOT NULL,
        predicted_value NUMERIC NOT NULL,
        lower_bound NUMERIC,
        upper_bound NUMERIC,
        confidence NUMERIC,
        horizon INTEGER,
        granularity VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_prediction UNIQUE (organization_id, prediction_type, prediction_date, horizon)
      )
    `);
    console.log('✅ Created ml_predictions table');

    // Create indexes for ml_predictions
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ml_predictions_organization ON ml_predictions(organization_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ml_predictions_type ON ml_predictions(prediction_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(prediction_date)`);
    console.log('✅ Created indexes for ml_predictions');

    // Create model_metadata table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS model_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL,
        model_type VARCHAR(50) NOT NULL,
        version VARCHAR(20) NOT NULL,
        accuracy NUMERIC,
        trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        parameters JSONB,
        CONSTRAINT unique_model UNIQUE (organization_id, model_type, version)
      )
    `);
    console.log('✅ Created model_metadata table');

    // Create indexes for model_metadata
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_model_metadata_organization ON model_metadata(organization_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_model_metadata_type ON model_metadata(model_type)`);
    console.log('✅ Created indexes for model_metadata');

    console.log('\n🎉 ML tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating ML tables:', error);
    process.exit(1);
  }
}

createMLTables().then(() => process.exit(0));
