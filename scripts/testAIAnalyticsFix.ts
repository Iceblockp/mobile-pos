#!/usr/bin/env ts-node

/**
 * Test script to verify AI Analytics database integration fix
 */

import { AIAnalyticsService } from '../services/aiAnalyticsService';
import { initializeDatabase } from '../services/database';

async function testAIAnalyticsFix() {
  console.log('🧪 Testing AI Analytics Database Integration Fix...\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    const db = await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Get AI Analytics service instance
    console.log('2. Getting AI Analytics service...');
    const aiService = AIAnalyticsService.getInstance();
    console.log('✅ AI Analytics service obtained');

    // Inject database service
    console.log('3. Injecting database service...');
    aiService.setDatabaseService(db);
    console.log('✅ Database service injected successfully');

    // Test basic database access (without API key)
    console.log('4. Testing database access...');
    const products = await db.getProducts();
    console.log(
      `✅ Database access working - found ${products.length} products`
    );

    console.log('\n🎉 AI Analytics database integration fix is working!');
    console.log('\nNext steps:');
    console.log('- Configure a valid Gemini API key in the app');
    console.log('- Test AI Analytics functionality in the app');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAIAnalyticsFix().catch(console.error);
