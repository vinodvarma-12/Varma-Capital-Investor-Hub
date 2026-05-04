import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'
import { supabase } from '@/lib/supabase/client'

export async function InvokeLLM(opts) {
  return invokeEdgeFunction('invoke-llm', opts)
}

export async function UploadFile({ file }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const name = file?.name ?? 'upload.bin'
  const ext = name.includes('.') ? name.split('.').pop() : 'bin'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('uploads').getPublicUrl(path)
  return { file_url: data.publicUrl }
}

export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  const res = await fetch(file_url)
  if (!res.ok) {
    return { status: 'error', details: `Failed to fetch file: ${res.status}` }
  }
  const text = await res.text()
  try {
    const output = await InvokeLLM({
      prompt:
        'Extract structured data from the following CSV or tabular text. Return only JSON matching the schema.\n\n' +
        text.slice(0, 12000),
      response_json_schema: json_schema,
    })
    return { status: 'success', output }
  } catch (e) {
    return { status: 'error', details: e?.message ?? String(e) }
  }
}

export async function SendEmail() {
  throw new Error('SendEmail is not configured for Supabase. Use Edge Functions or an email provider.')
}

export async function SendSMS() {
  throw new Error('SendSMS is not configured for Supabase.')
}

export async function GenerateImage() {
  throw new Error('GenerateImage is not configured for Supabase.')
}
