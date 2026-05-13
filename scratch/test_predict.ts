import fs from 'fs'
import path from 'path'

async function testPredict() {
  const imagePath = '/home/dev-lab/.gemini/antigravity/brain/e41dfa88-509a-46f5-afc8-59b51575d0c9/damaged_road_test_1778615263762.png'
  const imageBuffer = fs.readFileSync(imagePath)
  
  const formData = new FormData()
  const blob = new Blob([imageBuffer], { type: 'image/png' })
  formData.append('image', blob, 'test.png')

  // We'll temporarily override the Z_AI_BASE_URL via env in the process if we were calling the server,
  // but since we are calling localhost:3000, we need to change it in src/lib/inference-provider.ts
  
  console.log('🚀 Sending request to /api/predict...')
  const response = await fetch('http://localhost:3000/api/predict', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  console.log(JSON.stringify(result, null, 2))
}

testPredict().catch(console.error)
