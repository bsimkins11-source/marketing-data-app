import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Available voices: alloy, echo, fable, onyx, nova, shimmer
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy'

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice as any,
      input: text,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
} 