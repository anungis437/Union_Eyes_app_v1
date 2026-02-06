/**
 * Redis Connection Test
 * Quick script to verify Redis is working correctly
 * 
 * Run: npx tsx scripts/test-redis-connection.ts
 */

import IORedis from 'ioredis';

console.log('🧪 Testing Redis Connection...\n');

// Test 1: Basic Redis Connection (for notification worker)
console.log('Test 1: Basic Redis Connection (IORedis)');
const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  process.exit(1);
});

// Test connection
(async () => {
  try {
    // Test SET
    await redis.set('test:connection', 'success', 'EX', 10);
    console.log('✅ SET command successful');
    
    // Test GET
    const value = await redis.get('test:connection');
    console.log(`✅ GET command successful: ${value}`);
    
    // Test DEL
    await redis.del('test:connection');
    console.log('✅ DEL command successful');
    
    // Test pub/sub (for notifications)
    const subscriber = redis.duplicate();
    await subscriber.subscribe('test:channel');
    console.log('✅ PUB/SUB subscribe successful');
    
    await redis.publish('test:channel', JSON.stringify({ test: 'message' }));
    console.log('✅ PUB/SUB publish successful');
    
    await subscriber.unsubscribe('test:channel');
    await subscriber.quit();
    console.log('✅ PUB/SUB unsubscribe successful');
    
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Basic Redis connection: Working');
    console.log('  ✅ Key operations (SET/GET/DEL): Working');
    console.log('  ✅ Pub/Sub (notifications): Working');
    console.log('\n🎉 All Redis tests passed!');
    console.log('\n✨ Your Redis setup is ready for:');
    console.log('   - Job scheduling');
    console.log('   - Notification worker');
    console.log('   - Real-time pub/sub');
    
    // Test 2: Upstash Redis (optional)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('\n\nTest 2: Upstash Redis (Distributed Caching)');
      const { Redis } = await import('@upstash/redis');
      const upstash = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      
      await upstash.set('test:upstash', 'working', { ex: 10 });
      const upstashValue = await upstash.get('test:upstash');
      await upstash.del('test:upstash');
      
      console.log('✅ Upstash Redis connection: Working');
      console.log(`✅ Upstash value retrieved: ${upstashValue}`);
      console.log('\n✨ Distributed caching is ready!');
    } else {
      console.log('\n⚠️  Upstash Redis not configured (optional for local dev)');
      console.log('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed caching');
    }
    
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    await redis.quit();
    process.exit(1);
  }
})();
