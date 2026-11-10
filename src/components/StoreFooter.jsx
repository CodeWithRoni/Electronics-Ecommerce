import { footerSettings, footerSocials } from '../lib/footer';
import { RetailIcon } from './retail';
import { brandLogo, brandName } from '../lib/brand';

export default function StoreFooter({ settings, shop }) {
  const footer = footerSettings(settings, shop);
  const socials = footerSocials.filter(([key]) => footer[key]);
  const apps = [
    [footer.play_label, footer.play_url, 'playstore'],
    [footer.app_store_label, footer.app_store_url, 'appstore'],
  ].filter(([label, url]) => label && url);
  const footerLogo = footer.logo || (footer.company === brandName ? brandLogo : '');
  const support = footer.phone || (footer.locator_url && footer.locator_title);
  const contact = footer.logo || footer.company || footer.address || footer.email;

  return <footer className="store-footer">
    <div className="wrap store-footer-inner">
      <div className="store-footer-top">
        {(support || footer.support_heading) && <section className="store-footer-support">
          {footer.support_heading && <h2>{footer.support_heading}</h2>}
          {footer.phone && <a className="store-footer-card" href={`tel:${footer.phone.replace(/[^\d+]/g, '')}`}>
            <RetailIcon name="phone" size={21} /><span>{footer.support_hours && <small>{footer.support_hours}</small>}<strong>{footer.phone}</strong></span>
          </a>}
          {footer.locator_url && footer.locator_title && <a className="store-footer-card" href={footer.locator_url}>
            <RetailIcon name="pin" size={21} /><span>{footer.locator_label && <small>{footer.locator_label}</small>}<strong>{footer.locator_title}</strong></span>
          </a>}
        </section>}
        {(footer.links_heading || footer.links.length > 0) && <section>
          {footer.links_heading && <h2>{footer.links_heading}</h2>}
          <nav className="store-footer-links" aria-label={footer.links_heading || 'Footer navigation'}>
            {footer.links.map(({ label, url }, index) => <a key={index} href={url}>{label}</a>)}
          </nav>
        </section>}
        {(contact || footer.contact_heading) && <section className="store-footer-contact">
          {footer.contact_heading && <h2>{footer.contact_heading}</h2>}
          {footerLogo && <img className="retail-footer-logo" src={footerLogo} alt={footer.company || shop?.name || brandName} loading="lazy" />}
          {footer.company && (footer.logo || !footerLogo) && <strong>{footer.company}</strong>}
          {footer.address && <address>{footer.address}</address>}
          {footer.email && <p>{footer.email_label && <b>{footer.email_label}</b>}<a href={`mailto:${footer.email}`}>{footer.email}</a></p>}
        </section>}
      </div>
      {(apps.length > 0 || socials.length > 0) && <div className="store-footer-community">
        {apps.length > 0 && <div className="store-footer-apps">
          {footer.app_prompt && <span>{footer.app_prompt}</span>}
          {apps.map(([label, url, icon]) => <a className="store-footer-app" key={icon} href={url}>
            <RetailIcon name={icon} size={22} /><span>{label}</span>
          </a>)}
        </div>}
        {socials.length > 0 && <nav className="store-footer-socials" aria-label="Social links">
          {socials.map(([key, label]) => <a key={key} href={footer[key]} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
            <RetailIcon name={key} size={19} />
          </a>)}
        </nav>}
      </div>}
      {(footer.copyright || footer.powered_by) && <div className="store-footer-bottom">
        {footer.copyright && <span>{footer.copyright}</span>}
        {footer.powered_by && (footer.powered_url ? <a href={footer.powered_url}>{footer.powered_by}</a> : <span>{footer.powered_by}</span>)}
      </div>}
    </div>
  </footer>;
}
