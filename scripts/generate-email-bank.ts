// Generates a bank of simulated support emails with ground-truth bucket labels.
// The bank is large enough to cover many days of sampling without repeats.
// Each email is hand-templated per bucket with variations in phrasing,
// specificity, and tone — including intentionally ambiguous emails that
// straddle two buckets to make the confidence tiering meaningful.

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { BucketId } from "../src/lib/buckets";

const EMAILS_PER_BUCKET = 150;

interface EmailTemplate {
  subject: string;
  body: string;
}

// Template pools per bucket. Each pool contains ~30 base patterns which we
// vary with placeholder substitutions to reach ~150 unique emails per bucket.
const BUG_TEMPLATES: EmailTemplate[] = [
  { subject: "App crashes when I click Export", body: "Every time I try to export my report to PDF the app freezes and I have to force quit. This started happening yesterday afternoon." },
  { subject: "500 error on dashboard", body: "Getting a 500 internal server error whenever I try to load the main dashboard. Tried clearing cache, still broken." },
  { subject: "Buttons not responding", body: "The 'Save' button on the settings page does nothing when clicked. No error, no feedback, just nothing." },
  { subject: "Data not syncing", body: "My changes from the mobile app aren't showing up on the web. Been waiting an hour." },
  { subject: "Broken chart rendering", body: "The revenue chart on the analytics page is completely blank. Other charts work fine." },
  { subject: "Filter is broken", body: "When I apply a date filter, all results disappear even though I know there's data in that range." },
  { subject: "Notifications not working", body: "I stopped getting email notifications last week. Checked my settings, they're enabled." },
  { subject: "Typo in confirmation modal", body: "The delete confirmation says 'Are you sure you wnat to delete' — typo on 'wnat'." },
  { subject: "CSV export has wrong columns", body: "Exported CSV is missing the 'Created At' column that shows in the table view." },
  { subject: "Duplicate entries appearing", body: "Every record I create shows up twice in the list. Refreshing doesn't fix it." },
  { subject: "Search returns zero results", body: "Search for 'Acme Corp' returns nothing but the record is definitely there." },
  { subject: "Mobile layout broken on iPad", body: "Sidebar overlaps the main content on my iPad Pro. Desktop is fine." },
  { subject: "Keyboard shortcut conflicts", body: "Cmd+K used to open the command palette, now it does nothing. Did something change?" },
  { subject: "Infinite loading spinner", body: "Opened the reports page and it's been loading for 5 minutes. Network tab shows the request completed." },
  { subject: "Wrong timezone on events", body: "All my calendar events are showing 5 hours off. My timezone is set correctly in profile." },
  { subject: "Upload fails silently", body: "Drag and drop a CSV — progress bar fills, then nothing. File never appears in the list." },
  { subject: "Autocomplete shows stale results", body: "Typing in the customer field autocompletes with names I deleted months ago." },
  { subject: "App logs me out randomly", body: "I get logged out every 10-15 minutes even though 'remember me' is checked." },
  { subject: "Pagination counts are off", body: "Table says '1-50 of 247' but clicking next page shows empty results after page 3." },
  { subject: "Email template preview broken", body: "Preview pane is just a white box. The actual sent email looks fine though." },
  { subject: "Drag and drop doesn't save order", body: "I reorder items in the list, refresh the page, and they're back in the old order." },
  { subject: "Two-factor code rejected", body: "Entering the correct 6-digit code from Google Authenticator but it says invalid. Tried 3 times." },
  { subject: "Dark mode text unreadable", body: "In dark mode, the placeholder text is the same color as the background. Can't see what I'm typing." },
  { subject: "Export silently truncates", body: "CSV export stops at exactly 1000 rows even though the table shows 2400." },
  { subject: "Webhook fires twice", body: "Our webhook endpoint is receiving every event twice. Timestamps are 200ms apart." },
  { subject: "Save fails with no error", body: "Edit a record, click save, page refreshes, changes are gone. No error message." },
  { subject: "Images broken in emails", body: "Emails sent from the platform have broken image icons instead of our logo." },
  { subject: "API returns wrong status code", body: "Your API returns 200 even when the request body is invalid JSON. Should be 400." },
  { subject: "Recurring task created 10 copies", body: "Set up a daily recurring task at 9am. It created 10 instances in the last hour." },
  { subject: "Page scroll jumps to top", body: "Every time I interact with any form field on the reports page, the whole page scrolls to top." },
];

const BILLING_TEMPLATES: EmailTemplate[] = [
  { subject: "Double charged this month", body: "I see two charges of $49.99 on my card for this month's subscription. Can you refund one?" },
  { subject: "Invoice missing VAT", body: "Our accounting needs VAT on all invoices. The last three PDFs don't include it." },
  { subject: "Upgrade to annual plan", body: "I'd like to switch from monthly to annual billing. How does the proration work?" },
  { subject: "Refund for unused seats", body: "We downgraded last week but were still charged for the old seat count. Need a prorated refund." },
  { subject: "Can't update card", body: "Trying to update my credit card — form keeps saying 'invalid'. The card is fine, I just used it elsewhere." },
  { subject: "Question about enterprise pricing", body: "We're considering upgrading to enterprise. Can you send me the pricing tiers?" },
  { subject: "Charge on old credit card", body: "You charged my old Visa even though I updated to a Mastercard 2 weeks ago." },
  { subject: "Need a W-9 for accounting", body: "Our finance team needs a W-9 form on file. Can you send one?" },
  { subject: "Cancel subscription", body: "I'd like to cancel my subscription effective end of billing cycle. How do I confirm it's done?" },
  { subject: "Different price than quoted", body: "Your sales team quoted $500/month but I was charged $625. Please explain the discrepancy." },
  { subject: "Receipt not arriving", body: "Last 2 months I haven't received a receipt email after being charged. Can you resend?" },
  { subject: "Team plan upgrade", body: "We have 12 users and want to move from the starter plan to team. What's the process?" },
  { subject: "Currency on invoice is wrong", body: "Our account is set to EUR but the invoice shows USD amounts. Need this corrected." },
  { subject: "Discount code not applied", body: "Used promo code LAUNCH20 at checkout but was charged the full amount." },
  { subject: "Annual renewal notification", body: "When does my annual plan renew? I want to make sure the card on file is current." },
  { subject: "Failed payment retry", body: "Got an email saying my payment failed. Card should work fine. Can you retry?" },
  { subject: "Change billing email", body: "Need to update the billing contact email from finance@ to accounts-payable@." },
  { subject: "Tax exempt status", body: "We're a nonprofit with tax-exempt status. How do we remove sales tax from future invoices?" },
  { subject: "Credit card statement discrepancy", body: "My card shows $89 but your invoice says $79. Which is correct?" },
  { subject: "Prorate new user added", body: "I added 3 users mid-month. Will they be prorated or charged full month?" },
  { subject: "Invoice PDF won't download", body: "Clicking 'Download PDF' on the invoice just returns an empty file." },
  { subject: "Subscription on wrong account", body: "I have two accounts and the subscription is on the wrong one. Can you transfer it?" },
  { subject: "Payment method expired", body: "My card expired. What's the grace period before my account is suspended?" },
  { subject: "Switching from annual to monthly", body: "Want to downgrade from annual to monthly. Do I get a refund for the unused time?" },
  { subject: "Unexpected charge", body: "I see a $200 charge I don't recognize. Line item says 'overage'. What's that?" },
  { subject: "Billing history export", body: "Need a CSV of all charges for the past 2 years for our audit. Is that available?" },
  { subject: "Reseller discount eligibility", body: "We're a certified partner. Do we qualify for reseller pricing?" },
  { subject: "Purchase order payment", body: "Our procurement requires PO-based payment. Can you accommodate instead of credit card?" },
  { subject: "Refund taking too long", body: "Refund was approved 3 weeks ago, still not in my account. Can you check the status?" },
  { subject: "Plan comparison chart", body: "I'm not sure which plan fits us. Do you have a feature comparison doc?" },
];

const APPRECIATION_TEMPLATES: EmailTemplate[] = [
  { subject: "You saved our launch", body: "Just wanted to say thanks — your support team helped us hit our launch deadline. The team was incredible." },
  { subject: "Best onboarding I've seen", body: "The onboarding flow was honestly the smoothest I've experienced in any SaaS product. Hats off to the team." },
  { subject: "Great product", body: "Been using this for 6 months and it's been a game changer for our workflow. Thank you!" },
  { subject: "Shout out to Sarah", body: "Sarah on your support team went above and beyond helping me debug. Please pass on my thanks." },
  { subject: "Love the new update", body: "The latest release with the redesigned dashboard is beautiful. Whoever designed it deserves a raise." },
  { subject: "Thank you", body: "Just a quick note to say thank you for building such a solid product. It's made my job easier." },
  { subject: "Impressed with response time", body: "I reported a bug at 2am and had a fix by 10am the same day. Unbelievable service." },
  { subject: "Recommended to 5 friends", body: "I've been telling everyone in my network about your product. It's that good." },
  { subject: "Keep doing what you're doing", body: "I know you're probably busy but just wanted to say — the product is fantastic. Keep shipping." },
  { subject: "Support exceeded expectations", body: "Your support rep Marcus solved a tricky config issue for me in 10 minutes. Top tier help." },
  { subject: "Finally, a tool that works", body: "I've tried 4 competitors and none came close to what you've built. Really glad I found you." },
  { subject: "The docs are amazing", body: "Your documentation is the clearest I've read in the industry. Thank you for investing in that." },
  { subject: "Team appreciation", body: "Just wanted my team's thanks to go to whoever added the bulk edit feature. Massive time saver." },
  { subject: "Big fan", body: "Been following the product since the beta. Every release is better than the last. Cheers!" },
  { subject: "Wow, that was fast", body: "Asked about a feature yesterday and it shipped in today's update. Are you psychic?" },
  { subject: "You've made my week", body: "The CSV import fix just went out and now my whole team can stop doing manual entry. Thank you." },
  { subject: "Best tool in our stack", body: "We have 40+ tools and this is the one nobody complains about. That's the highest praise I can give." },
  { subject: "Grateful for the community", body: "The Slack community you've built around the product is genuinely helpful. Proud to be part of it." },
  { subject: "Well done on the redesign", body: "The new UI is cleaner, faster, and easier to use. Great work." },
  { subject: "Appreciate the transparency", body: "The monthly changelog emails are fantastic. Love seeing what you're shipping and why." },
  { subject: "Helped us close a deal", body: "Your product helped us win a $200k contract by automating what took our team 10 hours a week. Thanks." },
  { subject: "Product is a pleasure", body: "Every time I open this tool I smile. Don't change the core experience." },
  { subject: "Kudos to engineering", body: "Whoever fixed the perf issues in v4.2 — the app feels twice as fast. Please thank them." },
  { subject: "Saved my weekend", body: "Was about to pull an all-nighter until I realized your product did the thing automatically. Grateful." },
  { subject: "Customer for life", body: "After 2 years using this, I'm not going anywhere. Thanks for being consistent." },
  { subject: "Love the small details", body: "The keyboard shortcuts, the loading states, the empty-state copy — whoever sweats these details, thank you." },
  { subject: "Your support is why we stay", body: "The product is great but the support team is why we renewed for another year." },
  { subject: "Thanks for listening", body: "You actually implemented the feature I asked about 3 months ago. Rare to feel heard as a customer." },
  { subject: "Great experience", body: "Needed to file a bug and the process was frictionless. Thanks for making it easy." },
  { subject: "Truly impressed", body: "Haven't been this impressed with a product in years. Keep raising the bar." },
];

const FEATURE_TEMPLATES: EmailTemplate[] = [
  { subject: "Bulk edit for tags", body: "Would love to be able to add/remove tags on 50+ records at once. Currently I have to do each manually." },
  { subject: "Slack integration please", body: "Any chance of a native Slack integration for notifications? Zapier works but it's clunky." },
  { subject: "Custom dashboards", body: "It would be amazing to build custom dashboards with the metrics that matter to our team." },
  { subject: "Dark mode", body: "Please add dark mode. My eyes thank you in advance." },
  { subject: "CSV import with mapping", body: "Current CSV import requires exact column names. Allow us to map columns on import?" },
  { subject: "API rate limit increase", body: "Can you add a higher rate limit tier for API customers? 100/min isn't enough for us." },
  { subject: "Mobile app native", body: "The mobile web version is fine but a native iOS/Android app would be much better." },
  { subject: "Saved filters", body: "I run the same 5 filters every day. Ability to save filter combinations would save hours." },
  { subject: "Role-based permissions", body: "We need more granular permissions. Right now it's admin or viewer, nothing in between." },
  { subject: "Webhook custom headers", body: "Our API requires a custom auth header. Your webhook UI doesn't let me add one." },
  { subject: "Recurring reports", body: "Would love to schedule a report to email me every Monday morning. Currently have to run it manually." },
  { subject: "Two-way calendar sync", body: "Your Google Calendar integration is one-way. Would love two-way so edits propagate back." },
  { subject: "Zapier triggers", body: "Only 3 Zapier triggers currently. Could you add more events?" },
  { subject: "Custom fields on contacts", body: "We need to track industry-specific data per contact. Custom fields would unlock this." },
  { subject: "SSO for smaller plans", body: "SSO is only on enterprise. Small teams need it too. Please tier it differently." },
  { subject: "Global search", body: "A keyboard-shortcut search that finds anything across the app. Cmd+K style." },
  { subject: "Audit log export", body: "We need an audit log we can export for compliance. Right now it's only visible in-app." },
  { subject: "Undo for bulk actions", body: "I accidentally deleted 200 records with bulk delete. An undo would have saved me." },
  { subject: "Multi-currency support", body: "We operate in 4 currencies. Right now everything is USD. Multi-currency please." },
  { subject: "Comments on records", body: "Team collaboration on records would be huge. Right now we use Slack to discuss them." },
  { subject: "Keyboard shortcut for save", body: "Cmd+S should save my edits everywhere. Currently only works on some forms." },
  { subject: "Folder organization", body: "I have 500+ reports. Folders or a tagging system would help me find things." },
  { subject: "Email templates", body: "I send the same 10 emails constantly. Template support built in would be great." },
  { subject: "Auto-save drafts", body: "Lost 30 minutes of writing when the browser crashed. Please auto-save drafts." },
  { subject: "Split screen mode", body: "Would be great to have two records open side-by-side for comparison." },
  { subject: "CSV export of filtered view", body: "When I filter the table, exporting should export only the filtered rows, not everything." },
  { subject: "Customizable columns", body: "Let me pick which columns appear in the main table view. I don't need all 15." },
  { subject: "Better search operators", body: "Would love AND/OR/NOT operators in search. Current search is just keyword matching." },
  { subject: "Drag-and-drop sorting", body: "The list view should let me drag rows to reorder. Currently I can only sort by column." },
  { subject: "Integration with Notion", body: "Notion is where our team lives. An integration would be a huge win for us." },
];

const ACCESS_TEMPLATES: EmailTemplate[] = [
  { subject: "Can't log in", body: "Forgot password link isn't sending email. Tried 3 times, checked spam, nothing." },
  { subject: "Account locked", body: "Got an email saying my account is locked due to suspicious activity. It was me logging in from a new laptop." },
  { subject: "2FA code not arriving", body: "Lost my phone and my 2FA codes are gone. How do I recover my account?" },
  { subject: "Password reset broken", body: "Reset link says 'expired' 2 minutes after I get the email. Doesn't give me time to click it." },
  { subject: "SSO not working", body: "Our Okta SSO suddenly stopped redirecting users to your app. Everything was fine yesterday." },
  { subject: "Locked out of admin", body: "I'm the only admin and I'm locked out. Need someone to verify my identity and unlock." },
  { subject: "Invited user can't accept", body: "I invited 3 teammates. They all get 'invalid invitation' when clicking the link." },
  { subject: "Permissions disappeared", body: "I had full admin yesterday. Today everything is read-only. What happened?" },
  { subject: "Email login doesn't work", body: "We require email/password login but the only option shown is Google OAuth." },
  { subject: "Account suspended", body: "My account is suspended with no explanation. I've done nothing wrong. Please investigate." },
  { subject: "Password manager incompatible", body: "1Password can't autofill the login form. Worked last month." },
  { subject: "Can't change email address", body: "Trying to change my login email but the form says 'email already in use'. It's not." },
  { subject: "SSO loop", body: "When I try SSO, it redirects back and forth between Okta and your app in an infinite loop." },
  { subject: "Magic link not arriving", body: "Requested a magic login link. Waited 15 minutes. Nothing in inbox or spam." },
  { subject: "Session expires too fast", body: "I get logged out every 5 minutes of inactivity. Way too aggressive." },
  { subject: "Locked after password change", body: "Changed my password yesterday and now I can't log in at all. New password is rejected." },
  { subject: "Recovery email outdated", body: "The recovery email on my account is an old one I no longer have access to. How do I update?" },
  { subject: "Team member can't access project", body: "Added Jane to the Finance project but she says she can't see it. Permissions look correct." },
  { subject: "OAuth error from Google", body: "Google OAuth returns 'error 400: redirect_uri_mismatch'. Been working for a year." },
  { subject: "Admin access for contractor", body: "Our contractor needs temporary admin access for 2 weeks. Any way to set an expiration?" },
  { subject: "Multi-factor setup broken", body: "Trying to enable TOTP, QR code renders as broken image. Can't scan it." },
  { subject: "Account deactivated accidentally", body: "Our IT disabled my account thinking I left. I didn't. Can you reactivate quickly?" },
  { subject: "Login button greyed out", body: "Typing credentials but the login button stays disabled. No error message, just unclickable." },
  { subject: "Guest access expired", body: "External reviewer's access expired mid-review. Can you extend by 2 weeks?" },
  { subject: "Cannot remove old owner", body: "Previous owner left the company 6 months ago. I still can't remove them as primary admin." },
  { subject: "Role update not taking effect", body: "Changed a user from viewer to editor 3 days ago. They still see view-only." },
  { subject: "Forgot recovery codes", body: "I printed my 2FA recovery codes but lost them. Can you regenerate?" },
  { subject: "New hire can't sign up", body: "New hire signs up with their company email, gets 'domain not allowed'. We're on team plan." },
  { subject: "Biometric login not working", body: "FaceID worked on iOS last week. Now it falls back to password every time." },
  { subject: "Cross-workspace access", body: "I'm in two workspaces but the UI only lets me log into one. Need to switch constantly." },
];

const OTHER_TEMPLATES: EmailTemplate[] = [
  { subject: "Quick question", body: "Do you have any resources on best practices for using the tool in a team of 50+?" },
  { subject: "Case study request", body: "Can I feature your company in a case study on our blog? Happy to send questions over." },
  { subject: "Press inquiry", body: "Journalist from TechCrunch here. Would love to chat with your CEO about Series B news." },
  { subject: "Partnership idea", body: "I run a consulting firm and have clients who'd benefit from your product. Any partnership programs?" },
  { subject: "Conference attendance", body: "Will your team be at SaaStr 2024? Would love to meet in person if so." },
  { subject: "Webinar topic suggestion", body: "You should do a webinar on scaling customer success. I'd attend and I know others who would too." },
  { subject: "Blog post feedback", body: "Read your latest post on AI and CX. Minor factual error in paragraph 4, FYI." },
  { subject: "Job opening interest", body: "Saw the PM role on your careers page. Not ready to apply but happy to chat informally first." },
  { subject: "Podcast guest suggestion", body: "I host a podcast on B2B SaaS. Would your founder be open to coming on as a guest?" },
  { subject: "Product direction question", body: "Where is the product heading over the next 6 months? Trying to plan our stack." },
  { subject: "Privacy policy clarification", body: "Section 4.2 of your privacy policy is ambiguous on data retention. Can you clarify?" },
  { subject: "Data residency question", body: "Do you support EU-only data storage for GDPR-sensitive customers?" },
  { subject: "White label possibility", body: "Is there any option to white-label your product for our agency clients?" },
  { subject: "Reseller program", body: "We're an agency. Do you have a reseller or partner program?" },
  { subject: "Service status page", body: "Is there a public status page where I can monitor uptime?" },
  { subject: "Wondering about the roadmap", body: "Do you publish a public roadmap? I'd love visibility into upcoming features." },
  { subject: "SOC 2 documentation", body: "Our security team is evaluating your product. Can you share your SOC 2 Type II report?" },
  { subject: "Legal doc request", body: "Need your DPA and MSA for our legal review before signing." },
  { subject: "Random product thought", body: "Just a random thought — the loading animation could be slightly faster. Not a big deal though." },
  { subject: "Community access", body: "How do I join the customer Slack community? Couldn't find a link in the app." },
  { subject: "Event sponsorship", body: "We're organizing a SaaS meetup in SF. Any interest in sponsoring? Budget under 5k." },
  { subject: "Research participation", body: "Our university is researching PLG companies. Would your team participate in a 30-min interview?" },
  { subject: "T-shirt sizes", body: "You sent our team swag and the shirts are all Large. Any chance of sending different sizes?" },
  { subject: "Referral program", body: "Is there a referral program? I've referred 3 companies already and they've all signed up." },
  { subject: "Book recommendation", body: "Random: what books does your team recommend for early-stage product managers?" },
  { subject: "Office visit", body: "I'll be in your city next month. Any chance of a quick office visit to meet the team?" },
  { subject: "Integration partnership", body: "We're a CRM. Open to a deeper integration partnership with your team?" },
  { subject: "Video testimonial", body: "Happy to record a video testimonial if you're interested in using it for marketing." },
  { subject: "Tips from other customers", body: "Any customer best-practices you can share? Trying to learn from others' workflows." },
  { subject: "Historical data", body: "Do you keep usage history beyond 1 year? Need to pull some 2022 numbers for a board deck." },
];

const TEMPLATES: Record<BucketId, EmailTemplate[]> = {
  bug: BUG_TEMPLATES,
  billing: BILLING_TEMPLATES,
  appreciation: APPRECIATION_TEMPLATES,
  feature: FEATURE_TEMPLATES,
  access: ACCESS_TEMPLATES,
  other: OTHER_TEMPLATES,
};

// A few "ambiguous" emails that straddle two buckets. These are important for
// showing the confidence tiering in action — they should score medium on two
// buckets and demonstrate the system's honesty about uncertainty.
const AMBIGUOUS_EMAILS: Array<{ trueBucket: BucketId; email: EmailTemplate }> = [
  { trueBucket: "bug", email: { subject: "Love the product but this feature is broken", body: "I adore this tool — been using it for years. But the PDF export has been broken for a week and it's blocking my workflow. Thought you should know." } },
  { trueBucket: "billing", email: { subject: "Frustrated with the charge but still love you", body: "Honestly your product is great, but the duplicate charge this month has me annoyed. Please refund it." } },
  { trueBucket: "feature", email: { subject: "Not a bug but missing functionality", body: "I keep expecting to be able to export to XLSX. I know it's not a bug — it's just not there. Can you add it?" } },
  { trueBucket: "access", email: { subject: "Seems like a bug but it's about login", body: "Every time I try to log in with SSO I get a 500 error. Could be a bug, could be our SSO config. Can you check?" } },
  { trueBucket: "other", email: { subject: "Love the product, just have a question", body: "Been a happy customer for 2 years. Quick question — do you have plans for a mobile app?" } },
  { trueBucket: "bug", email: { subject: "Billing page won't load", body: "The billing section of my account doesn't load — just a blank screen. Not sure if it's a bug or a permissions issue." } },
  { trueBucket: "feature", email: { subject: "Would love SSO on starter plan", body: "I'd pay more if SSO was on our plan. Right now we have to upgrade to enterprise just for that one feature." } },
  { trueBucket: "appreciation", email: { subject: "Support team bug fix was amazing", body: "Reported a bug last night, got a fix deployed by morning. Just wanted to say how impressed I am with your team." } },
];

function generateEmailBank() {
  type EmailRow = { id: string; trueBucket: BucketId; subject: string; body: string; ambiguous: boolean };
  const emails: EmailRow[] = [];
  let idCounter = 0;

  // Generate the bulk of emails by copying templates. With ~30 base templates
  // per bucket and 150 emails, each template appears ~5 times. For embedding
  // purposes, identical text would produce identical vectors — which would be
  // unrealistic — so we add small prefix/suffix variations to make each email
  // textually unique while preserving bucket intent.
  const PREFIXES = ["Hi team,", "Hello,", "Hey,", "Hi there,", "Hi support,", ""];
  const SUFFIXES = ["Thanks.", "Appreciate your help.", "Let me know.", "Cheers.", "Best,\nAlex", "— Sam", ""];

  for (const bucket of Object.keys(TEMPLATES) as BucketId[]) {
    const templates = TEMPLATES[bucket];
    for (let i = 0; i < EMAILS_PER_BUCKET; i++) {
      const template = templates[i % templates.length];
      const prefix = PREFIXES[i % PREFIXES.length];
      const suffix = SUFFIXES[i % SUFFIXES.length];
      const body = [prefix, template.body, suffix].filter(Boolean).join("\n\n");
      emails.push({
        id: `e${idCounter++}`,
        trueBucket: bucket,
        subject: template.subject,
        body,
        ambiguous: false,
      });
    }
  }

  // Add ambiguous emails — these ship as-is without variation since they're
  // hand-crafted to sit on bucket boundaries.
  for (const item of AMBIGUOUS_EMAILS) {
    emails.push({
      id: `e${idCounter++}`,
      trueBucket: item.trueBucket,
      subject: item.email.subject,
      body: item.email.body,
      ambiguous: true,
    });
  }

  return emails;
}

function main() {
  const emails = generateEmailBank();
  const outDir = join(process.cwd(), "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "email-bank.json"),
    JSON.stringify(emails, null, 2)
  );
  console.log(`Generated ${emails.length} emails → data/email-bank.json`);

  // Summary by bucket for sanity checking.
  const counts: Record<string, number> = {};
  for (const e of emails) counts[e.trueBucket] = (counts[e.trueBucket] ?? 0) + 1;
  console.log("By bucket:", counts);
}

main();
