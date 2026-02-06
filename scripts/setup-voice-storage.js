// Setup Supabase Storage for Voice Recordings
// Run this script to create the voice-recordings bucket and set up policies

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupVoiceRecordingsStorage() {
  console.log('🚀 Setting up Supabase Storage for Voice Recordings...\n');

  try {
    // 1. Check if bucket exists
    console.log('📦 Checking for existing voice-recordings bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'voice-recordings');

    if (bucketExists) {
      console.log('✅ Bucket "voice-recordings" already exists');
    } else {
      // 2. Create bucket
      console.log('📦 Creating voice-recordings bucket...');
      const { data: bucket, error: createError } = await supabase.storage.createBucket('voice-recordings', {
        public: false, // Not publicly accessible without authentication
        fileSizeLimit: 26214400, // 25 MB in bytes
        allowedMimeTypes: [
          'audio/wav',
          'audio/webm',
          'audio/ogg',
          'audio/mp3',
          'audio/mpeg',
          'audio/mp4',
        ],
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        process.exit(1);
      }

      console.log('✅ Bucket "voice-recordings" created successfully');
    }

    // 3. Test upload (optional)
    console.log('\n🧪 Testing bucket access...');
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const testPath = `test/access-test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(testPath, testFile);

    if (uploadError) {
      console.error('❌ Error testing upload:', uploadError.message);
      console.log('Note: You may need to set up storage policies in Supabase Dashboard');
    } else {
      console.log('✅ Test upload successful');
      
      // Clean up test file
      await supabase.storage.from('voice-recordings').remove([testPath]);
      console.log('✅ Test file cleaned up');
    }

    // 4. Instructions for policies
    console.log('\n📋 Next Steps:');
    console.log('1. Go to Supabase Dashboard > Storage > voice-recordings');
    console.log('2. Click "Policies" tab');
    console.log('3. Add the following policies:');
    console.log('');
    console.log('   Policy 1: "Authenticated users can upload"');
    console.log('   - Operation: INSERT');
    console.log('   - Target roles: authenticated');
    console.log('   - WITH CHECK: bucket_id = \'voice-recordings\'');
    console.log('');
    console.log('   Policy 2: "Authenticated users can view"');
    console.log('   - Operation: SELECT');
    console.log('   - Target roles: authenticated');
    console.log('   - USING: bucket_id = \'voice-recordings\'');
    console.log('');
    console.log('   Policy 3: "Users can delete their own recordings"');
    console.log('   - Operation: DELETE');
    console.log('   - Target roles: authenticated');
    console.log('   - USING: bucket_id = \'voice-recordings\'');
    console.log('');
    console.log('   Policy 4: "Service role full access"');
    console.log('   - Operation: ALL');
    console.log('   - Target roles: service_role');
    console.log('   - USING: bucket_id = \'voice-recordings\'');
    console.log('');
    console.log('✅ Voice recordings storage setup complete!');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupVoiceRecordingsStorage();
