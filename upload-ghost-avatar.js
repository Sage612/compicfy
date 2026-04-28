// Plain JS version — no TypeScript needed
// Run with: node upload-ghost-avatar.js

const { createClient } = require('@supabase/supabase-js')
const fs   = require('fs')
const path = require('path')

const GHOST_ID = '00000000-0000-0000-0000-000000000000'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const svgPath   = path.join(__dirname, 'ghost-avatar.svg')
  const svgBuffer = fs.readFileSync(svgPath)

  console.log('Uploading ghost avatar...')

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(`${GHOST_ID}/avatar.svg`, svgBuffer, {
      contentType: 'image/svg+xml',
      upsert:      true,
    })

  if (uploadError) {
    console.error('Upload failed:', uploadError.message)
    process.exit(1)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${GHOST_ID}/avatar.svg`)

  console.log('Uploaded to:', publicUrl)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', GHOST_ID)

  if (updateError) {
    console.error('Profile update failed:', updateError.message)
    process.exit(1)
  }

  console.log('Ghost profile avatar updated ✓')
  console.log('Avatar URL:', publicUrl)
}

main()