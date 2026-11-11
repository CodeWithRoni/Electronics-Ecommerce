import { RetailIcon } from '../components/retail';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { customerAuth, accountRedirect } from '../lib/customerAuth';
import { brandIcon } from '../lib/brand';
import { footerSettings } from '../lib/footer';

export function Field({ label, name, type = 'text', showRequired = false, ...props }) {
  return <label className="account-field"><span>{label}{showRequired && <span className="account-required" aria-hidden="true"> *</span>}</span>
    <input name={name} type={type} placeholder={label} required {...props} />
  </label>;
}

export function AccountCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const url = new URL(window.location.href);
    const action = url.searchParams.get('account');
    if (!['recovery', 'confirmed'].includes(action)) return;
    let active = true;
    customerAuth.getSession().then(() => {
      if (!active) return;
      const current = new URL(window.location.href);
      current.searchParams.delete('account');
      current.hash = '';
      window.history.replaceState(window.history.state, '', current);
      navigate(action === 'recovery' ? '/account/reset' : '/account/login', { replace: true });
    });
    return () => { active = false; };
  }, [navigate]);
  return null;
}

function RegistrationConfirmation({ confirmed, email, shopName }) {
  return <div className="account-page">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/" aria-label="Home"><RetailIcon name="home" size={15} /></Link><span>/</span><Link to="/account/login">Account</Link><span>/</span><span>Registration</span></nav>
    <section className="account-confirmation" aria-labelledby="confirm-account-heading">
      <img src={brandIcon} width="56" height="56" alt="" />
      <p className="account-confirmation-brand">{shopName} · Registration</p>
      <h1 id="confirm-account-heading" tabIndex={-1} ref={(heading) => heading?.focus()}>{confirmed ? 'Your account is ready' : 'Please confirm your email'}</h1>
      <p>{confirmed ? 'Your account was created successfully.' : <>Look for the confirmation link {email ? <>at <strong>{email}</strong></> : 'in your inbox'}. Open it to activate your account.</>}</p>
      {!confirmed && <p className="account-confirmation-tip">If you don’t see it, check your spam or junk folder.</p>}
      <Link to="/account/login" state={email ? { email } : undefined} className="account-primary">Login with your credentials</Link>
    </section>
  </div>;
}

export default function Account({ page, shop, settings, session }) {
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { state } = useLocation();

  const footer = footerSettings(settings, shop);
  const privacyLink = footer.links.find(({ label }) => /privacy/i.test(label))?.url;
  const register = page === 'register';
  const reset = page === 'reset';
  const forgot = page === 'forgot';
  const title = page === 'privacy' ? 'Privacy Policy' : register ? (details ? 'Set Your Password' : 'Register Account') : forgot ? 'Forgotten Password' : reset ? 'Reset Password' : 'Account Login';

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    const data = new FormData(event.currentTarget);
    const get = (name) => String(data.get(name) || '');
    if (register && !details) {
      const phone = get('phone').trim().replace(/[\s()-]/g, '');
      if (!/^\+?\d{8,15}$/.test(phone)) { setError('Enter a valid mobile number.'); return; }
      const first_name = get('first_name').trim(), last_name = get('last_name').trim();
      if (!first_name || !last_name) { setError('Enter both your first and last name.'); return; }
      setDetails({ email: get('email').trim(), first_name, last_name, phone });
      return;
    }
    const password = get('password');
    if ((register || reset) && password !== get('confirm')) { setError('The passwords must match.'); return; }
    setBusy(true);
    try {
      let result;
      if (register) {
        const { email, ...profile } = details;
        result = await customerAuth.signUp({ email, password, options: { data: profile, emailRedirectTo: accountRedirect('confirmed') } });
        if (!result.error) navigate('/account/check-email', {
          replace: true, state: { email, confirmed: Boolean(result.data.session) },
        });
      } else if (forgot) {
        result = await customerAuth.resetPasswordForEmail(get('email').trim(), { redirectTo: accountRedirect('recovery') });
        if (!result.error) setMessage('If that address has an account, check your inbox for a reset link.');
      } else if (reset) {
        result = await customerAuth.updateUser({ password });
        if (!result.error) navigate('/account/login', { replace: true });
      } else {
        const email = get('email').trim();
        result = await customerAuth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
    } catch (issue) {
      setError(issue.message || 'The account service could not be reached. Try again.');
    } finally { setBusy(false); }
  }

  if (page === 'check-email') return <RegistrationConfirmation confirmed={state?.confirmed} email={state?.email} shopName={shop.name} />;

  if (session && !reset && page !== 'privacy') return <Navigate to="/account/profile" replace />;

  return <div className="account-page">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/" aria-label="Home"><RetailIcon name="home-solid" size={15} /></Link><span>/</span><Link to="/account/login">Account</Link><span>/</span><span>{title}</span></nav>
    <section className="account-form" aria-labelledby="account-heading">
      <h1 id="account-heading">{title}</h1>
      {page === 'privacy' ? <>
        <p>{shop.name} uses your name, email and mobile number to manage your account and communicate with you about it. Account credentials are managed by Supabase Auth. When you place an order, your contact and delivery details are used to fulfill it.</p>
        {footer.email && <p>For privacy requests, email <a href={`mailto:${footer.email}`}>{footer.email}</a>.</p>}
        <Link to="/account/register">Return to registration</Link>
      </> : session === undefined ? <p role="status">Loading account…</p> : reset && !session ? <p>This reset link is unavailable or expired. <Link to="/account/forgot">Request a new link</Link>.</p> :
        <form onSubmit={submit}>
          {register && !details ? <>
            <div className="account-name-fields">
              <Field label="First Name" name="first_name" showRequired autoComplete="given-name" maxLength={80} />
              <Field label="Last Name" name="last_name" showRequired autoComplete="family-name" maxLength={80} />
            </div>
            <Field label="E-Mail" name="email" showRequired type="email" autoComplete="email" maxLength={254} />
            <Field label="Mobile" name="phone" showRequired type="tel" autoComplete="tel" maxLength={24} />
            <div className="account-consent"><label><input type="checkbox" name="consent" required /> I have read and agree to the</label>{privacyLink ? <a href={privacyLink} target="_blank" rel="noreferrer">Privacy Policy</a> : <a href="#/account/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>}</div>
          </> : (register || reset) ? <>
            <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
            <Field label="Confirm Password" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
          </> : <>
            <Field label="E-Mail" name="email" type="email" autoComplete={forgot ? 'email' : 'username'} defaultValue={page === 'login' ? state?.email : undefined} maxLength={254} />
            {!forgot && <div className="account-password"><Field label="Password" name="password" type="password" autoComplete="current-password" maxLength={72} /><Link to="/account/forgot">Forgotten Password?</Link></div>}
          </>}
          <button type="submit" className="account-primary" disabled={busy}>{busy ? 'Please wait…' : register ? (details ? 'Create Account' : 'Continue') : forgot ? 'Send Reset Link' : reset ? 'Save Password' : 'Login'}</button>
          {register && details && <button type="button" className="account-link" onClick={() => setDetails(null)}>Back to registration details</button>}
        </form>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {session === null && page === 'login' && <><div className="account-divider">Don't have an account?</div><Link className="account-outline" to="/account/register">Create Your Account</Link></>}
      {session === null && (register || forgot) && <><div className="account-divider">Already have an account?</div><p>{register ? 'If you already have an account with us, Please login at the' : 'Return to the'} <Link to="/account/login">login page</Link>.</p></>}
    </section>
  </div>;
}
