import "./FooterHome.css";

/**
 * ByteBud: footer for the buyer site (about, warranty policy, contact).
 * The link targets and contact details are placeholders: replace them with your real pages and info.
 */
export default function Footer ({
  logoSrc,
  contactEmail = "bytebud@gmail.com",
  contactPhone = "",
  location = "Cagayan de Oro, Philippines",
  onNavigate,
}) {
  const go = (event, href) => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(href);
    }
  };
  return (
    <footer className="bb-footer">
      <div className="bb-footer-inner">
        <div className="bb-footer-col bb-footer-about">
          <div className="bb-footer-brand">
            {logoSrc ? (
              <img className="bb-footer-logo" src={logoSrc} alt="" />
            ) : (
              <span className="bb-footer-logo-placeholder" aria-hidden="true">
                LOGO
              </span>
            )}
            <span className="bb-footer-name">ByteBud</span>
          </div>
          <p>
            Tested and graded refurbished laptops from surplus corporate stock, matched to what you study and priced
            for students.
          </p>
        </div>

        <div className="bb-footer-col">
          <h3>About</h3>
          <ul>
            <li><a href="/about" onClick={(e) => go(e, "/about")}>About ByteBud</a></li>
            <li><a href="/about#grading" onClick={(e) => go(e, "/about#grading")}>How grading works</a></li>
            <li><a href="/about#student-pricing" onClick={(e) => go(e, "/about#student-pricing")}>Student pricing</a></li>
          </ul>
        </div>

        <div className="bb-footer-col">
          <h3>Warranty</h3>
          <ul>
            <li><a href="/warranty" onClick={(e) => go(e, "/warranty")}>Warranty policy</a></li>
            <li><a href="/warranty#claims" onClick={(e) => go(e, "/warranty#claims")}>How to file a claim</a></li>
            <li><a href="/warranty#returns" onClick={(e) => go(e, "/warranty#returns")}>Returns</a></li>
          </ul>
        </div>

        <div className="bb-footer-col">
          <h3>Contact</h3>
          <ul>
            <li><a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
            {contactPhone && <li>{contactPhone}</li>}
            <li>{location}</li>
          </ul>
        </div>
      </div>

      <div className="bb-footer-bottom">
        <span>&copy; {new Date().getFullYear()} ByteBud. All rights reserved.</span>
      </div>
    </footer>
  );
}