import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login');

  if (token) {
    return <Navigate to="/" replace />;
  }

  function resetFeedback() {
    setError('');
    setSuccess('');
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      setAuth({ token: data.token, user: data.user });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      await api.post('/auth/signup', {
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSuccess('Account created. Enter the 6-digit code sent to your email to activate it.');
      setView('verify');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      await api.post('/auth/verify', {
        email: email.trim(),
        verificationCode: verificationCode.trim(),
      });
      setSuccess('Account activated. You can now sign in.');
      setView('login');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data || 'Code verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    resetFeedback();

    try {
      await api.post('/auth/resend', null, {
        params: { email: email.trim() },
      });
      setSuccess('A new code has been sent to your email.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__overlay" />
      <div className="login-page__content container-fluid">
        <div className="row min-vh-100 align-items-start pt-4 pt-md-5">
          <div className="col-lg-7 d-none d-lg-flex flex-column justify-content-center text-white px-5 pt-5">
          </div>
          <div className="col-lg-5 col-12 d-flex justify-content-lg-end justify-content-center px-3 px-md-5">
            <Card className="login-card shadow-lg border-0 w-100">
              <div className='form-photo '>
              <img src="/images/smartload-logo.png" alt="SmartLoad" className="mx-auto d-block mt-4"  style={ {  width: 300 } }/>
              </div>
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="loginbuttons my-3 -flex gap-2 mb-4 d-flex">
                  <Button
                    variant={view === 'login' ? 'primary' : 'outline-primary'}
                    className="flex-grow-1"
                    onClick={() => {
                      setView('login');
                      resetFeedback();
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant={view === 'signup' ? 'primary' : 'outline-primary'}
                    className="flex-grow-1"
                    onClick={() => {
                      setView('signup');
                      resetFeedback();
                    }}
                  >
                    Sign Up
                  </Button>
                  <Button
                    variant={view === 'verify' ? 'primary' : 'outline-primary'}
                    className="flex-grow-1"
                    onClick={() => {
                      setView('verify');
                      resetFeedback();
                    }}
                  >
                    Verify
                  </Button>
                </div>
                      </div>
                {error && (
                  <Alert variant="danger" className="small">
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" className="small">
                    {success}
                  </Alert>
                )}

                {view === 'login' && (
                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3" controlId="login-email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="login-password">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100 fw-semibold py-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Signing in…
                        </>
                      ) : (
                        'CONTINUE'
                      )}
                    </Button>
                  </Form>
                )}

                {view === 'signup' && (
                  <Form onSubmit={handleSignup}>
                    <Form.Group className="mb-3" controlId="signup-username">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                        minLength={3}
                        autoComplete="username"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="signup-email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="signup-password">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100 fw-semibold py-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating account…
                        </>
                      ) : (
                        'SIGN UP'
                      )}
                    </Button>
                  </Form>
                )}

                {view === 'verify' && (
                  <Form onSubmit={handleVerify}>
                    <Form.Group className="mb-3" controlId="verify-email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="verify-code">
                      <Form.Label>Verification Code</Form.Label>
                      <Form.Control
                        type="text"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        required
                        minLength={6}
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-grow-1 fw-semibold py-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Verifying…
                          </>
                        ) : (
                          'ACTIVATE ACCOUNT'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline-primary"
                        className="fw-semibold"
                        disabled={loading || !email.trim()}
                        onClick={handleResendCode}

                      >
                        RESEND CODE
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
