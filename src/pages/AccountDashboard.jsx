import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { RetailIcon } from '../components/retail';
import { Spinner } from '../components/ui';
import { api } from '../lib/api';
import { accountRedirect, customerAuth } from '../lib/customerAuth';
import { footerSettings } from '../lib/footer';
import { fdatetime, money } from '../lib/format';
import { useFavorites } from '../lib/favorites';
import { useShop } from '../lib/store';
import { Field } from './Account';
import './account-dashboard.css';

const profilePath = '/account/profile';
const sections = [
  { id: 'orders', label: 'My Orders', title: 'Order History', icon: 'truck' },
  { id: 'addresses', label: 'Address Book', icon: 'pin' },
  { id: 'edit', label: 'Edit Profile', title: 'My Account Information', icon: 'user' },
  { id: 'password', label: 'Change Password', icon: 'key' },
  { id: 'pcs', label: 'Saved PCs', icon: 'monitor' },
  { id: 'saved', label: 'Saved Products', icon: 'heart' },
  { id: 'quotes', label: 'Quotes', icon: 'document' },
  { id: 'points', label: 'GearGrid Points', icon: 'star' },
  { id: 'transactions', label: 'Transactions', title: 'Your Transactions', icon: 'wallet' },
  { id: 'complaints', label: 'Raise a Complaint', icon: 'alert' },
  { id: 'service', label: 'Service Request', icon: 'shield' },
];
const groups = [
  { title: 'Orders & Tracking', icon: 'truck', ids: ['orders'] },
  { title: 'Profile & Info', icon: 'user', ids: ['addresses', 'edit', 'password', 'pcs', 'saved', 'points', 'transactions', 'quotes'] },
  { title: 'Quick Links & Support', icon: 'alert', ids: ['complaints', 'service'] },
];
const statuses = { new: 'Received', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function AccountDashboard({ session, logout, signingOut, theme, toggleTheme }) {
  const { section } = useParams();
  const { shop, settings, products } = useShop((state) => state.catalog);
  const favorites = useFavorites((state) => state.ids);
  const [orderPage, setOrderPage] = useState(0);
  const [orderHistory, setOrderHistory] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [retry, setRetry] = useState(0);
  const needsOrders = !section || section === 'orders' || section === 'transactions';
  const token = session?.access_token;

  useEffect(() => {
    if (!token || !needsOrders) return;
    let active = true;
    api('customer.orders', { page: orderPage }, token).then((data) => {
      if (active) setOrderHistory({ ...data, page: orderPage });
    }).catch((issue) => {
      if (active) setOrderError(issue.message);
    });
    return () => { active = false; };
  }, [token, needsOrders, orderPage, retry]);

  if (session === undefined) return <Spinner label="Loading account" />;
  if (!session) return <Navigate to="/account/login" replace />;
  const page = sections.find(({ id }) => id === section);
  if (section && !page) return <Navigate to={profilePath} replace />;

  const user = session.user;
  const profile = user.user_metadata || {};
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name || user.email || 'Customer';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  const savedBuilds = Array.isArray(profile.saved_pcs) ? profile.saved_pcs : [];
  const savedProducts = products.filter(({ id }) => favorites.includes(id)).length;
  const title = page?.title || page?.label || 'My Account';
  const signOutButton = <button type="button" className="account-nav-action" onClick={logout} disabled={signingOut}>{signingOut ? 'Logging out…' : 'Logout'}</button>;
  const status = orderError ? <div className="account-panel" role="alert">{orderError} <button className="account-link" onClick={() => { setOrderError(''); setRetry((value) => value + 1); }}>Try again</button></div>
    : orderHistory?.page !== orderPage ? <Spinner label="Loading orders" /> : null;

  return <div className="account-dashboard">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/" aria-label="Home"><RetailIcon name="home-solid" size={16} /></Link>
      <span aria-hidden="true">/</span>{page ? <><Link to={profilePath}>Account</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></> : <span aria-current="page">Account</span>}
    </nav>
    {!page ? <>
      <div className="account-welcome">
        <div className="account-panel account-welcome-person">
          <span className="account-avatar" aria-hidden="true">{initials}</span><div><p className="muted">Welcome back</p><h1>{name}</h1><p className="muted">{user.email}</p></div>
        </div>
        <Link className="account-welcome-banner" to="/track"><RetailIcon name="truck" size={32} /><div><span>Orders & Tracking</span><strong>Track your delivery</strong></div><span aria-hidden="true">→</span></Link>
      </div>
      <div className="account-stats">
        {[[sections[0], orderHistory?.count ?? '—'], [sections[4], savedBuilds.length], [sections[5], savedProducts]].map(([item, value]) =>
          <Link className="account-panel account-stat" key={item.id} to={`${profilePath}/${item.id}`}><span className="account-tile-icon"><RetailIcon name={item.icon} /></span><span><strong>{value}</strong><small>{item.label}</small></span></Link>)}
      </div>
      <div className="account-manage"><h2>Manage Your Account</h2><p className="muted">Update your information, track orders and manage your saved items.</p></div>
      <div className="account-tiles">{sections.map((item) => <Link className="account-panel account-tile" key={item.id} to={`${profilePath}/${item.id}`}>
        <span className="account-tile-icon"><RetailIcon name={item.icon} /></span>{item.label}</Link>)}</div>
      <div className="account-bottom-actions"><button className="account-nav-action" type="button" onClick={toggleTheme}>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</button>{signOutButton}</div>
    </> : <div className="account-columns">
      <nav className="account-sidebar" aria-label="Account navigation">
        <Link to={profilePath} className="account-overview-link">← My Account</Link>
        {groups.map((group) => <section key={group.title}>
          <h2><RetailIcon name={group.icon} size={19} />{group.title}</h2>
          {group.ids.map((id) => <NavLink key={id} to={`${profilePath}/${id}`}>{sections.find((item) => item.id === id).label}</NavLink>)}
          {group.icon === 'truck' && <Link to="/track">Track an order</Link>}
          {group.icon === 'alert' && signOutButton}
        </section>)}
      </nav>
      <section className="account-section" aria-labelledby="account-section-title">
        <h1 id="account-section-title">{title}</h1>
        {section === 'orders' && (status || <OrderHistory data={orderHistory} currency={shop.currency} setPage={setOrderPage} />)}
        {section === 'addresses' && <AddressBook profile={profile} name={name} />}
        {section === 'edit' && <EditProfile user={user} />}
        {section === 'password' && <PasswordForm />}
        {section === 'pcs' && <SavedPCs builds={savedBuilds} />}
        {section === 'saved' && <AccountEmpty icon="heart" title={savedProducts ? `${savedProducts} saved product${savedProducts === 1 ? '' : 's'}` : 'Your saved list is empty'}
          description="Your wishlist is saved in this browser."><Link to={savedProducts ? '/wishlist' : '/products'} className="account-primary">{savedProducts ? 'View Wishlist' : 'Browse Products'}</Link></AccountEmpty>}
        {section === 'transactions' && (status || <OrderHistory data={orderHistory} currency={shop.currency} setPage={setOrderPage} payments />)}
        {section === 'points' && <AccountEmpty icon="star" title="Rewards are currently unavailable" description={`A points program hasn’t been set up for ${shop.name} yet.`} />}
        {['quotes', 'complaints', 'service'].includes(section) && <SupportPage section={section} footer={footerSettings(settings, shop)} />}
      </section>
    </div>}
  </div>;
}

function AccountEmpty({ icon, title, description, children }) {
  return <div className="account-panel account-empty"><span className="account-tile-icon"><RetailIcon name={icon} size={27} /></span>
    <h2>{title}</h2><p className="muted">{description}</p>{children}</div>;
}

function OrderHistory({ data, currency, setPage, payments = false }) {
  const { orders, count, page } = data;
  const [openOrder, setOpenOrder] = useState('');
  return <>
    {payments && <p className="muted account-payment-intro">Payment methods and verification status for your online orders.</p>}
    {orders.length ? (payments ? <div className="account-panel account-table-wrap"><table className="account-table">
      <thead><tr><th scope="col">Date Added</th><th scope="col">Order</th><th scope="col">Payment</th><th scope="col">Order Total</th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.order_no}><td>{fdatetime(order.created_at)}</td><td>{order.order_no}</td>
        <td>{paymentLabel(order)}</td><td>{money(order.total, currency)}</td></tr>)}</tbody>
    </table></div> : <div className="account-list">{orders.map((order) => {
      const expanded = openOrder === order.order_no;
      return <article key={order.order_no} className="account-panel account-order">
        <div className="account-row"><div><strong>Order #{order.order_no}</strong><small className="muted">Date added {fdatetime(order.created_at)}</small></div>
          <span className="account-status" data-status={order.status}>{statuses[order.status] || order.status}</span></div>
        <ul>{(expanded ? order.items : order.items.slice(0, 1)).map((item) => <li key={item.product_id}><RetailIcon name="box" size={19} />
          <div>{item.name}<small className="muted">{money(item.price, currency)} × {item.qty}</small></div></li>)}</ul>
        <div className="account-row"><div><strong className="account-order-total">{money(order.total, currency)}</strong><small className="muted">{order.items.length} item types</small></div>
          <button className="account-primary" type="button" aria-expanded={expanded} onClick={() => setOpenOrder(expanded ? '' : order.order_no)}>{expanded ? 'Hide details' : 'View'}</button></div>
        {expanded && <p className="muted">Delivery {money(order.delivery, currency)} · {paymentLabel(order)}</p>}
      </article>;
    })}</div>) : <AccountEmpty icon={payments ? 'wallet' : 'truck'} title={payments ? 'No order payments yet' : 'No online orders yet'}
      description="Orders placed while signed in will appear here. You can track earlier orders with your order number and phone.">
      <Link to="/track" className="account-primary">Track an Order</Link>
    </AccountEmpty>}
    {count > 20 && <nav className="account-pagination" aria-label="Order pages">
      <button className="btn" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page + 1} of {Math.ceil(count / 20)}</span>
      <button className="btn" disabled={(page + 1) * 20 >= count} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </>;
}

function paymentLabel(order) {
  if (order.payment !== 'bkash') return 'Cash on delivery';
  return `bKash · ${order.payment_status === 'verified' ? 'Verified' : order.payment_status === 'invalid' ? 'Not verified' : 'Pending verification'}`;
}

function useAccountSave() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return {
    busy, message, error,
    async run(save, success) {
      if (busy) return;
      setBusy(true);
      setError('');
      setMessage('');
      try {
        await save();
        setMessage(success);
      } catch (issue) {
        setError(issue.message || 'Could not save your changes. Try again.');
      } finally {
        setBusy(false);
      }
    },
  };
}

function SaveFeedback({ save }) {
  return <>{save.message && <p className="account-feedback" role="status">{save.message}</p>}
    {save.error && <p className="account-error" role="alert">{save.error}</p>}</>;
}

async function updateUser(attributes, options) {
  const { error } = await customerAuth.updateUser(attributes, options);
  if (error) throw error;
}

const fieldValue = (form, name) => String(form.get(name) || '').trim();
function EditProfile({ user }) {
  const save = useAccountSave();
  const profile = user.user_metadata || {};
  return <form className="account-settings-form" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(['first_name', 'last_name', 'phone', 'fax'].map((key) => [key, fieldValue(form, key)]));
    data.phone = data.phone.replace(/[\s()-]/g, '');
    const email = fieldValue(form, 'email');
    const emailChanged = email.toLowerCase() !== user.email?.toLowerCase();
    save.run(async () => {
      if (!data.first_name || !data.last_name) throw new Error('Enter both your first and last name.');
      if (!/^\+?\d{8,15}$/.test(data.phone)) throw new Error('Enter a valid telephone number.');
      await updateUser(emailChanged ? { data, email } : { data }, { emailRedirectTo: accountRedirect('confirmed') });
    }, emailChanged ? 'Profile saved. Check your inbox for the email change confirmation.' : 'Your profile has been saved.');
  }}>
    <div className="account-name-fields"><Field label="First Name" name="first_name" showRequired autoComplete="given-name" maxLength={80} defaultValue={profile.first_name} />
      <Field label="Last Name" name="last_name" showRequired autoComplete="family-name" maxLength={80} defaultValue={profile.last_name} /></div>
    <Field label="E-Mail" name="email" showRequired type="email" autoComplete="email" maxLength={254} defaultValue={user.email} />
    <Field label="Telephone" name="phone" showRequired type="tel" autoComplete="tel" maxLength={24} defaultValue={profile.phone || user.phone} />
    <Field label="Fax" name="fax" type="tel" maxLength={24} defaultValue={profile.fax} required={false} />
    <button className="account-primary" disabled={save.busy}>Save Changes</button><SaveFeedback save={save} />
  </form>;
}

function PasswordForm() {
  const save = useAccountSave();
  return <form className="account-settings-form" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    save.run(async () => {
      if (data.get('password') !== data.get('confirm')) throw new Error('The new passwords must match.');
      await updateUser({ password: data.get('password'), current_password: data.get('current') });
      form.reset();
    }, 'Your password has been changed.');
  }}>
    <Field label="Current Password" name="current" type="password" autoComplete="current-password" maxLength={72} />
    <Field label="New Password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
    <Field label="Confirm New Password" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
    <button className="account-primary" disabled={save.busy}>Change Password</button><SaveFeedback save={save} />
  </form>;
}

function AddressBook({ profile, name }) {
  const addresses = Array.isArray(profile.address_book) ? profile.address_book : [];
  const [editing, setEditing] = useState(null);
  const save = useAccountSave();
  return <div className="account-list">
    {addresses.length === 0 && !editing && <AccountEmpty icon="pin" title="No saved addresses" description="Add an address to keep your delivery details handy." />}
    {addresses.map((address, index) => <article className="account-panel account-row" key={address.id}>
      <div><strong>{address.name} {index === 0 && <span className="account-status" data-status="delivered">Default</span>}</strong>
        <p>{address.street}, {address.city}{address.postcode && ` ${address.postcode}`}</p>
        <small className="muted">{address.phone}</small></div>
      <div className="account-row-actions">
        {index > 0 && <button className="btn" disabled={save.busy} onClick={() => save.run(() => updateUser({ data: { address_book: [address, ...addresses.filter(({ id }) => id !== address.id)] } }), 'Default address updated.')}>Make Default</button>}
        <button className="btn" disabled={save.busy || Boolean(editing)} onClick={() => setEditing(address)}>Edit</button>
        <button className="btn" disabled={save.busy || Boolean(editing)} onClick={() => {
          if (window.confirm('Remove this address?')) save.run(() => updateUser({ data: { address_book: addresses.filter(({ id }) => id !== address.id) } }), 'Address removed.');
        }}>Delete</button>
      </div>
    </article>)}
    {editing ? <form className="account-panel account-settings-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const fields = Object.fromEntries(['name', 'phone', 'street', 'city', 'postcode'].map((key) => [key, fieldValue(form, key)]));
      save.run(async () => {
        fields.phone = fields.phone.replace(/[\s()-]/g, '');
        if (!fields.name || !fields.street || !fields.city || !/^\+?\d{8,15}$/.test(fields.phone)) throw new Error('Enter a name, valid phone number, street address and city.');
        const item = { ...fields, id: editing.id || crypto.randomUUID() };
        const next = editing.id ? addresses.map((address) => address.id === item.id ? item : address) : [...addresses, item];
        await updateUser({ data: { address_book: next } });
        setEditing(null);
      }, 'Address saved.');
    }}>
      <h2>{editing.id ? 'Edit Address' : 'New Address'}</h2>
      <Field label="Recipient Name" name="name" defaultValue={editing.name ?? name} autoComplete="name" maxLength={120} />
      <Field label="Telephone" name="phone" type="tel" defaultValue={editing.phone ?? profile.phone} autoComplete="tel" maxLength={24} />
      <Field label="Street Address" name="street" defaultValue={editing.street} autoComplete="street-address" maxLength={220} />
      <div className="account-name-fields"><Field label="City or District" name="city" defaultValue={editing.city} autoComplete="address-level2" maxLength={80} />
        <Field label="Postcode" name="postcode" defaultValue={editing.postcode} autoComplete="postal-code" maxLength={16} required={false} /></div>
      <div className="account-row-actions"><button className="account-primary" disabled={save.busy}>Save Address</button>
        <button type="button" className="btn" disabled={save.busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form> : <button className="account-add-address" onClick={() => setEditing({})} disabled={save.busy || addresses.length >= 10}>＋ New Address</button>}
    {addresses.length >= 10 && <p className="muted">You can save up to 10 addresses.</p>}
    <SaveFeedback save={save} />
  </div>;
}

function SavedPCs({ builds }) {
  const save = useAccountSave();
  return <div className="account-list">
    {builds.length ? builds.map((build) => <article key={build.id} className="account-panel account-row">
      <div className="account-saved-pc"><span className="account-tile-icon"><RetailIcon name="monitor" /></span><div>
        <strong>{build.name}</strong><small className="muted">Saved {fdatetime(build.date)}</small></div></div>
      <div className="account-row-actions"><Link className="account-primary" to={`/pc-builder?saved=${encodeURIComponent(build.id)}`}>View</Link>
        <button className="btn" disabled={save.busy} onClick={() => {
          if (window.confirm('Delete this saved PC?')) save.run(() => updateUser({ data: { saved_pcs: builds.filter(({ id }) => id !== build.id) } }), 'Saved PC removed.');
        }}>Delete</button></div>
    </article>) : <AccountEmpty icon="monitor" title="No saved PCs" description="Configure a PC and select Save PC while signed in.">
      <Link to="/pc-builder" className="account-primary">Open PC Builder</Link>
    </AccountEmpty>}
    <SaveFeedback save={save} />
  </div>;
}

function SupportPage({ section, footer }) {
  const content = {
    quotes: ['document', 'Request a quote', 'Tell us the products and quantities you need.', 'Request Quote', 'Quote request'],
    complaints: ['alert', 'Need help with an order?', 'Include your order number and tell us what went wrong.', 'Email a Complaint', 'Order complaint'],
    service: ['shield', 'Request product service', 'Include the product name, order number and a description of the issue.', 'Email a Service Request', 'Product service request'],
  };
  const [icon, title, description, action, subject] = content[section];
  const email = footer.email?.match(/^[^\s@?]+@[^\s@?]+$/)?.[0];
  return <AccountEmpty icon={icon} title={title} description={description}>
    {email ? <a className="account-primary" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>{action}</a>
      : footer.phone ? <a className="account-primary" href={`tel:${footer.phone}`}>Call Support</a> : <p className="muted">Support contact details are currently unavailable.</p>}
  </AccountEmpty>;
}
