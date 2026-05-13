import fs from 'fs'

async function testGoogleDirect() {
  const apiKey = 'AIzaSyC0V6u2p2p2p2p2p2p2p2p2p2p2p2p2p2p' // Simplified placeholder, I'll use the real one from .env
  const realKey = process.env.GEMINI_API_KEY
  
  const imagePath = '/home/dev-lab/.gemini/antigravity/brain/e41dfa88-509a-46f5-afc8-59b51575d0c9/damaged_road_test_1778615263762.png'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${realKey}`
  
  const body = {
    contents: [{
      parts: [
        { text: "Analyze this road image. Answer 'OK' if you see it." },
        { inline_data: { mime_type: "image/png", data: base64 } }
      ]
    }]
  }

  console.log('🚀 Sending request to Google directly...')
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const result = await response.json()
  console.log(JSON.stringify(result, null, 2))
}

testGoogleDirect().catch(console.error)
