// Alternative approach - use older cheerio version that works with Node 18
// First run: npm install cheerio@1.0.0-rc.12 axios

console.log('🚀 Scraper script started!');
console.log('Node version:', process.version);

const axios = require('axios');

// Try to load cheerio with error handling
let cheerio;
try {
  cheerio = require('cheerio');
  console.log('✅ Cheerio loaded successfully');
} catch (error) {
  console.error('❌ Cheerio loading failed:', error.message);
  console.log('Run: npm install cheerio@1.0.0-rc.12');
  process.exit(1);
}

// Test cheerio parsing
function testCheerio() {
  console.log('\n=== Testing Cheerio ===');
  
  try {
    const testHTML = `
      <div class="MuiStack-root css-jh7maf">
        <p class="MuiTypography-root MuiTypography-body1 css-p2sag6">Application Deadline</p>
        <h5 class="MuiTypography-root MuiTypography-h5 css-3ari9v">December 31, 2024</h5>
      </div>
    `;
    
    const $ = cheerio.load(testHTML);
    
    const blocks = $('.MuiStack-root.css-jh7maf');
    console.log('Found test blocks:', blocks.length);
    
    if (blocks.length > 0) {
      const label = blocks.find('p.MuiTypography-root.MuiTypography-body1.css-p2sag6');
      const value = blocks.find('h5.MuiTypography-root.MuiTypography-h5.css-3ari9v');
      
      console.log('Label text:', label.length > 0 ? label.text() : 'NOT FOUND');
      console.log('Value text:', value.length > 0 ? value.text() : 'NOT FOUND');
      console.log('Contains deadline:', label.length > 0 ? label.text().toLowerCase().includes('deadline') : false);
    }
    
    console.log('✅ Cheerio test successful');
    
  } catch (error) {
    console.error('❌ Cheerio test failed:', error.message);
  }
}

// Simple HTTP test
async function testHTTP() {
  console.log('\n=== Testing HTTP Request ===');
  
  try {
    const response = await axios.get('https://httpbin.org/json', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ HTTP request successful');
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('❌ HTTP request failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testHTTP();
  testCheerio();
  console.log('\n🎉 All tests completed!');
}

runTests().catch(console.error);