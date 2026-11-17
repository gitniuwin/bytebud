import { useEffect } from "react";
import { BuyerShell } from "./BuyerShared";
import "./LaptopDetailPage.css";
import "./InfoPages.css";

/**
 * ByteBud: footer pages (/about and /warranty).
 * Both pages use the same shell as the rest of the buyer site. The policy wording lives in the
 * sections below, so edit the text here when your policy changes.
 */

const STUDENT_DISCOUNT_PERCENT = 40;
const WARRANTY_MONTHS = 3;
const SERVICE_MONTHS = 12;

function useScrollToHash(deps) {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(decodeURIComponent(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, deps);
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="ip-section">
      <h2 className="ld-h2">{title}</h2>
      {children}
    </section>
  );
}

export function AboutPage({ pathname, ...shell }) {
  const go = (e, href) => { if (shell.onNavigate) { e.preventDefault(); shell.onNavigate(href); } };
  useScrollToHash([pathname]);
  return (
    <BuyerShell active="" {...shell}>
      <h1 className="by-heading">About ByteBud</h1>
      <p className="by-subheading">Tested and graded refurbished laptops, priced for students.</p>

      <div className="ip-stack">
        <Section id="about" title="About ByteBud">
          <p>
            ByteBud sells refurbished laptops from surplus corporate stock. Every unit is tested, graded and
            listed with its real specs, so you know what you are getting before you pick it up at our store.
            We match laptops to what you study, so you do not pay for power you will not use.
          </p>
        </Section>

        <Section id="grading" title="How grading works">
          <p>
            Every laptop is tested before it is listed. Its grade is based on how well the device performs in
            those tests. The grade is shown on each listing next to the laptop&rsquo;s actual memory and storage,
            so you can compare units of the same model fairly.
          </p>
        </Section>

        <Section id="student-pricing" title="Student pricing">
          <p>
            Verified students get <strong>{STUDENT_DISCOUNT_PERCENT}% off</strong> laptops. To qualify, submit your
            school email and a proof of enrollment in <a href="/account?tab=verification" onClick={(e) => go(e, "/account?tab=verification")}>My Account &rarr; Student Verification</a>.
            Once our staff approve it, your student price shows on every listing and at checkout.
          </p>
        </Section>
      </div>
    </BuyerShell>
  );
}

export function WarrantyPage({ pathname, ...shell }) {
  const go = (e, href) => { if (shell.onNavigate) { e.preventDefault(); shell.onNavigate(href); } };
  useScrollToHash([pathname]);
  return (
    <BuyerShell active="" {...shell}>
      <h1 className="by-heading">Warranty and returns</h1>
      <p className="by-subheading">What is covered, how to file a claim, and what happens next.</p>

      <div className="ip-stack">
        <Section id="policy" title="Warranty policy">
          <p>Every laptop comes with two kinds of protection, and both start on the day you pick it up.</p>
          <div className="ip-grid">
            <div className="ip-card">
              <h3>{WARRANTY_MONTHS}-month unit change warranty</h3>
              <p>
                If a hardware part fails within {WARRANTY_MONTHS} months, you can bring the laptop back and we will
                repair it, if it can be fixed.
              </p>
              <p>
                If it cannot be fixed, the value of the damaged hardware parts is deducted from the price you paid,
                and the remaining balance becomes <strong>store credit</strong>.
              </p>
            </div>
            <div className="ip-card">
              <h3>{SERVICE_MONTHS}-month store service</h3>
              <p>
                For {SERVICE_MONTHS} months you can visit our store for services such as cleaning, software or hardware
                servicing, and RAM or storage upgrades. Any parts you want to buy, like RAM or storage, are paid
                separately.
              </p>
            </div>
          </div>

          <h3 className="ip-h3">How store credit works</h3>
          <ul className="ip-list">
            <li>Use your credit to choose any laptop priced at or below the credit amount.</li>
            <li>If you want a laptop that costs more, you pay the difference.</li>
          </ul>

          <h3 className="ip-h3">What is not covered</h3>
          <p>
            The warranty covers hardware that breaks on its own. It does not cover damage caused by use, such as
            water spills or drops that break the hardware. Our staff inspect the laptop to decide whether a problem is covered.
          </p>
        </Section>

        <Section id="claims" title="How to file a claim">
          <ol className="ip-list">
            <li>Log in and open <a href="/account?tab=warranty" onClick={(e) => go(e, "/account?tab=warranty")}>My Account &rarr; Warranty &amp; Returns</a>.</li>
            <li>Choose the laptop and describe the problem.</li>
            <li>Bring the laptop to our store. Staff will check it and tell you whether it can be repaired or converted to store credit.</li>
          </ol>
        </Section>

        <Section id="returns" title="Returns">
          <p>
            Within the {WARRANTY_MONTHS}-month warranty period you can return a laptop with a covered hardware problem.
            We will either repair it or turn the remaining value into store credit, as described above. Returns for
            damage caused by use are not accepted under the warranty.
          </p>
        </Section>
      </div>
    </BuyerShell>
  );
}
