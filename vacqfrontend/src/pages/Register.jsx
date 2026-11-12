import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FaUser } from 'react-icons/fa'
import { useSelector, useDispatch } from 'react-redux'
import { register, reset } from '../features/auth/authSlice'

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    tel: ''
  });

  const { name, email, password, password2, tel } = formData;

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { user, isLoading, isError, isSuccess, message } = useSelector((state) => {
    return state.auth
  })

  useEffect(() => {
    if (isError) {
      toast.error(message)
    }

    //redirect when logged in
    if (isSuccess || user) {
      navigate('/')
    }

    dispatch(reset())
  }, [isError, isSuccess, user, message, navigate, dispatch])

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  }

  // Same rules as the API (middleware/validate.js), checked before sending so the user gets instant feedback.
  // The API still validates everything: this is only for UX.
  const validate = () => {
    if (!name.trim() || name.length > 100) return 'Please enter your name (up to 100 characters)'
    if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/.test(email)) return 'Please enter a valid email'
    if (!/^[0-9+\-\s]{8,15}$/.test(tel)) return 'Telephone must be 8-15 digits (may contain +, - or spaces)'
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      return 'Password must be 8-72 characters and contain a letter and a digit'
    if (password !== password2) return 'Passwords do not match'
    return null
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return toast.error(problem)
    dispatch(register({ name, email, password, tel }))
  }

  return (
    <>
      <section className="heading">
        <h1>
          <FaUser /> Register
        </h1>
        <p>Please create an account</p>
      </section>

      <section className='form'>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <input
              type="text"
              className='form-control'
              id='name'
              name='name'
              value={name}
              onChange={onChange}
              placeholder='Enter Your name'
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              className='form-control'
              id='email'
              name='email'
              value={email}
              onChange={onChange}
              placeholder='Enter Your email'
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              className='form-control'
              id='password'
              name='password'
              value={password}
              onChange={onChange}
              placeholder='Enter Your password'
              minLength={8}
              maxLength={72}
              autoComplete='new-password'
              required
            />
            <p className='hint'>At least 8 characters, with a letter and a digit.</p>
          </div>
          <div className="form-group">
            <input
              type="password"
              className='form-control'
              id='password2'
              name='password2'
              value={password2}
              onChange={onChange}
              placeholder='Confirm Your password'
              required
            />
          </div>
          <div className="form-group">
            <input
              type="tel"
              className='form-control'
              id='tel'
              name='tel'
              value={tel}
              onChange={onChange}
              placeholder='Enter Your telephone number'
              pattern='[0-9+\-\s]{8,15}'
              required
            />
          </div>
          <div className='form-group'>
            <button className='btn btn-block' disabled={isLoading}>{isLoading ? 'Creating account…' : 'Submit'}</button>
          </div>
        </form>
      </section>
    </>
  )
}

export default Register;
