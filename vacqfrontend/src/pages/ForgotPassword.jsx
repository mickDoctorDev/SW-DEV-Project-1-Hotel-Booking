import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api, { errorMessage } from '../app/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/auth/forgotpassword', { email })
      setSent(true) // the API answers the same way for every email
    } catch (err) {
      if (err.response?.status !== 429) toast.error(errorMessage(err)) // 429 already shows its own toast
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <section className='heading'>
        <h1>Forgot password</h1>
        <p>Enter your email and we will send you a link to choose a new password</p>
      </section>

      <section className='form'>
        {sent ? (
          <p role='status'>If an account exists for <strong>{email}</strong>, a reset link is on its way. It is valid for 10 minutes. Check your spam folder if you do not see it.</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className='form-group'>
              <input type='email' className='form-control' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter Your email' aria-label='Email' required />
            </div>
            <div className='form-group'>
              <button className='btn btn-block' disabled={sending}>{sending ? 'Sending…' : 'Send reset link'}</button>
            </div>
          </form>
        )}
        <div className='form-links'><Link to='/login'>Back to log in</Link></div>
      </section>
    </>
  )
}

export default ForgotPassword
