/**
 * AI Endpoints Testing Script
 * Tests the AI API endpoints without requiring Clerk authentication
 * Uses direct database connection for testing
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeedbackPost() {
  console.log('\n📝 Testing Feedback POST...');
  
  const testData = {
    query_id: '7ba567db-5c19-4f61-b492-385ca10d8ba0',
    tenant_id: 'test-tenant-001',
    user_id: 'test-user-123',
    rating: 5,
    comment: 'Excellent response, very helpful!'
  };

  const { data, error } = await supabase
    .from('ai_feedback')
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return null;
  }

  console.log('✅ Feedback created:', data.id);
  return data.id;
}

async function testFeedbackGet(queryId: string) {
  console.log('\n📖 Testing Feedback GET...');
  
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('query_id', queryId)
    .eq('organization_id', 'test-tenant-001')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${data.length} feedback record(s)`);
  data.forEach((fb: any, i: number) => {
    console.log(`   ${i + 1}. Rating: ${fb.rating}/5, Comment: "${fb.comment}"`);
  });
}

async function testSearchChunks() {
  console.log('\n🔍 Testing Search (via RPC)...');
  
  const { data, error } = await supabase.rpc('search_ai_chunks_text', {
    p_tenant_id: 'test-tenant-001',
    p_search_query: 'grievance process',
    p_max_results: 5
  });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${data?.length || 0} matching chunks`);
  if (data && data.length > 0) {
    console.log(`   Sample: "${data[0].content?.substring(0, 100)}..."`);
  }
}

async function testAnalyticsViews() {
  console.log('\n📊 Testing Analytics Views...');
  
  // Test usage view
  const { data: usage, error: usageError } = await supabase
    .from('ai_usage_by_tenant')
    .select('*')
    .limit(5);

  if (usageError) {
    console.error('❌ Usage view error:', usageError.message);
  } else {
    console.log(`✅ Usage by tenant (${usage.length} tenants):`);
    usage.forEach((u: any) => {
      console.log(`   ${u.tenant_id}: ${u.query_count} queries, ${u.avg_latency_ms}ms avg, ${(u.success_rate * 100).toFixed(0)}% success`);
    });
  }

  // Test feedback view
  const { data: feedback, error: feedbackError } = await supabase
    .from('ai_feedback_summary')
    .select('*')
    .limit(5);

  if (feedbackError) {
    console.error('❌ Feedback view error:', feedbackError.message);
  } else {
    console.log(`\n✅ Feedback summary (${feedback.length} tenants):`);
    feedback.forEach((f: any) => {
      console.log(`   ${f.tenant_id}: ${f.feedback_count} ratings, ${f.avg_rating.toFixed(1)}/5 avg, ${(f.positive_rate * 100).toFixed(0)}% positive`);
    });
  }
}

async function insertTestDocument() {
  console.log('\n📄 Creating test document...');
  
  const { data: doc, error: docError } = await supabase
    .from('ai_documents')
    .insert({
      tenant_id: 'test-tenant-001',
      title: 'Union Rights & Grievance Process Guide',
      content: 'This guide explains the grievance process for union members. Step 1: File a written complaint with your shop steward. Step 2: The steward will investigate and attempt informal resolution. Step 3: If unresolved, the grievance advances to formal arbitration.',
      metadata: {
        type: 'policy',
        year: 2024,
        category: 'grievance'
      }
    })
    .select()
    .single();

  if (docError) {
    console.error('❌ Document error:', docError.message);
    return null;
  }

  console.log('✅ Document created:', doc.id);

  // Create chunks
  const chunks = [
    'This guide explains the grievance process for union members.',
    'Step 1: File a written complaint with your shop steward.',
    'Step 2: The steward will investigate and attempt informal resolution.',
    'Step 3: If unresolved, the grievance advances to formal arbitration.'
  ];

  for (let i = 0; i < chunks.length; i++) {
    const { error: chunkError } = await supabase
      .from('ai_chunks')
      .insert({
        document_id: doc.id,
        tenant_id: 'test-tenant-001',
        content: chunks[i],
        chunk_index: i,
        metadata: { section: `step-${i}` }
      });

    if (chunkError) {
      console.error(`❌ Chunk ${i} error:`, chunkError.message);
    }
  }

  console.log(`✅ Created ${chunks.length} chunks`);
  return doc.id;
}

async function runTests() {
  console.log('🚀 Starting AI Endpoints Tests\n');
  console.log('Using Supabase connection:', supabaseUrl);

  try {
    // Test 1: Create test document and chunks
    await insertTestDocument();

    // Test 2: Test feedback POST
    const feedbackId = await testFeedbackPost();

    // Test 3: Test feedback GET
    await testFeedbackGet('7ba567db-5c19-4f61-b492-385ca10d8ba0');

    // Test 4: Test search
    await testSearchChunks();

    // Test 5: Test analytics views
    await testAnalyticsViews();

    console.log('\n✅ All tests completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test API routes via browser (requires Clerk auth)');
    console.log('   2. Follow AI_API_TESTING_GUIDE.md for HTTP endpoint testing');
    console.log('   3. Monitor usage with: SELECT * FROM ai_usage_by_tenant;');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
