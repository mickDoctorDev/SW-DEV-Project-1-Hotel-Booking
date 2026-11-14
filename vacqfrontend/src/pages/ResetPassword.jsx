import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api, { errorMessage } from '../app/api'

function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    setSaving(true)
    try {
      await api.put(`/auth/resetpassword/${encodeURIComponent(token)}`, { password })
      toast.success('Password changed. Please log in.')
      navigate('/login')
    } catch (err) {
      if (err.response?.status !== 429) toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className='heading'>
        <h1>Choose a new password</h1>
        <p>At least 8 characters, with a letter and a digit</p>
      </section>

      <section className='form'>
        <form onSubmit={onSubmit}>
          <div className='form-group'>
            <input type='password' className='form-control' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='New password' aria-label='New password' autoComplete='new-password' required />
          </div>
          <div className='form-group'>
            <input type='password' className='form-control' value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Confirm new password' aria-label='Confirm new password' autoComplete='new-password' required />
          </div>
          <div className='form-group'>
            <button className='btn btn-block' disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
        <div className='form-links'><Link to='/forgot-password'>Link expired? Request a new one</Link></div>
      </section>
    </>
  )
}

export default ResetPassword
