// Simple test to verify file existence
async function testFileExistence() {
  const baseUrl = '/data/GCF_000005845.2_ASM584v2/analysis/'
  const testFile = 'chromosome_GCF_000005845.2_ASM584v2_hc_all.csv'
  const fullPath = baseUrl + testFile
  
  console.log('Testing file:', fullPath)
  
  try {
    const response = await fetch(fullPath)
    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
    if (response.ok) {
      const text = await response.text()
      console.log('Content length:', text.length)
      console.log('First 200 chars:', text.substring(0, 200))
    }
  } catch (error) {
    console.log('Error:', error)
  }
}

// Run the test
testFileExistence()