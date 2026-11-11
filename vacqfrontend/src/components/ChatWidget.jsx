import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { FaCommentDots, FaTimes, FaPaperPlane } from 'react-icons/fa'
import api, { API_BASE } from '../app/api'

const HISTORY = 10 // turns sent as context (the API accepts at most 12)
const GREETING = { role: 'assistant', content: 'Hi! I can help with our hotels, your bookings and how to use the site. สอบถามเป็นภาษาไทยได้เลยค่ะ' }

// POST /chat streams Server-Sent Events; axios cannot read a streamed body, so this uses fetch.
// On 401 the access token is refreshed once (same as the API client does) and the request retried.
async function openStream(messages, signal, retried = false) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  })
  if (res.status === 401 && !retried) {
    await api.post('/auth/refresh')
    return openStream(messages, signal, true)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const wait = res.headers.get('Retry-After')
    throw new Error(res.status === 429 && wait ? `${body.message} (${wait}s)` : body.message || 'The assistant is unavailable')
  }
  return res.body
}

async function* events(body) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    let i
    while ((i = buffer.indexOf('\n\n')) >= 0) {
      const line = buffer.slice(0, i).trim()
      buffer = buffer.slice(i + 2)
      if (line.startsWith('data:')) yield JSON.parse(line.slice(5))
    }
  }
}

function ChatWindow() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)   // waiting for / receiving an answer
  const [typing, setTyping] = useState(false) // no text yet: show the typing indicator
  const listRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight) }, [messages, typing, open])
  useEffect(() => () => abortRef.current?.abort(), []) // stop streaming when the widget goes away

  const send = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const history = [...messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    setTyping(true)

    const controller = new AbortController()
    abortRef.current = controller
    const append = (delta) => setMessages((list) => {
      const copy = list.slice()
      copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + delta }
      return copy
    })
    const fail = (msg) => setMessages((list) => {
      const copy = list.slice()
      copy[copy.length - 1] = { role: 'assistant', content: msg, error: true }
      return copy
    })

    try {
      // the greeting is UI only; the API needs the conversation to start with the user
      const context = history.filter((m) => m !== GREETING && !m.error).slice(-HISTORY)
      while (context[0]?.role === 'assistant') context.shift()
      const body = await openStream(context.map(({ role, content }) => ({ role, content })), controller.signal)
      for await (const ev of events(body)) {
        if (ev.delta) { setTyping(false); append(ev.delta) }
        if (ev.error) fail(ev.error)
      }
    } catch (err) {
      if (err.name !== 'AbortError') fail(err.message)
    } finally {
      setBusy(false)
      setTyping(false)
    }
  }

  return (
    <div className='chat-widget'>
      {open && (
        <section className='chat-panel' aria-label='Support chat'>
          <header className='chat-head'>
            <div>
              <strong>Hotel Booking assistant</strong>
              <span className='chat-sub'>AI · answers can be wrong</span>
            </div>
            <button className='chat-icon-btn' onClick={() => setOpen(false)} aria-label='Close chat'><FaTimes /></button>
          </header>

          <div className='chat-messages' ref={listRef} aria-live='polite'>
            {messages.map((m, i) =>
              m.content || !(i === messages.length - 1 && typing) ? (
                <div key={i} className={`chat-msg ${m.role}${m.error ? ' error' : ''}`}>{m.content}</div>
              ) : null)}
            {typing && (
              <div className='chat-msg assistant typing' aria-label='Assistant is typing'>
                <span></span><span></span><span></span>
              </div>
            )}
          </div>

          <form className='chat-input' onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask about hotels or your bookings…'
              maxLength={1000}
              aria-label='Message'
              autoFocus
            />
            <button className='chat-icon-btn send' disabled={busy || !input.trim()} aria-label='Send'><FaPaperPlane /></button>
          </form>
        </section>
      )}

      <button className='chat-fab' onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Open support chat'}>
        {open ? <FaTimes /> : <FaCommentDots />}
      </button>
    </div>
  )
}

// Registered users only (Additional Req 3). Keyed by user, so logging in as someone else starts a fresh
// conversation and no previous user's messages stay on screen.
function ChatWidget() {
  const { user } = useSelector((state) => state.auth)
  return user ? <ChatWindow key={user._id} /> : null
}

export default ChatWidget
