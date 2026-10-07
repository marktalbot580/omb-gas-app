/* In-app help guide. Plain topics, searchable, works offline.
   Each topic: t = title, k = extra search words, h = html (kept simple: paragraphs, numbered steps, bullets). */
const HELP = [
  { t: 'Getting started: set up your details first', k: 'setup first time business address gas safe number engineer signature logo',
    h: `<p>Do this once, before your first certificate. Everything you enter here is printed on your PDFs.</p>
<ol><li>Tap <b>Settings</b> at the bottom.</li>
<li>Under <b>Business</b>, fill in your business name, address, telephone, email and Gas Safe Register number.</li>
<li>Under <b>Engineer</b>, fill in your name and Gas Safe ID.</li>
<li>Add your company logo under <b>Your branding</b> (optional, it appears on the app and every PDF).</li>
<li>Under <b>Prices</b>, enter what you normally charge so invoices fill in for you.</li>
<li>Under <b>Bank details</b>, enter the account you want customers to pay into. These are printed on invoices.</li></ol>
<p>Until the business address, Gas Safe number and engineer details are filled in, the home screen shows a yellow reminder.</p>` },

  { t: 'Put the app on your phone’s home screen', k: 'install icon add to home screen iphone android safari chrome app',
    h: `<p>Installing it makes the app open full screen like any other app, and it keeps working with no signal.</p>
<p><b>iPhone (use Safari):</b></p>
<ol><li>Open app.ombgas.com in Safari.</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
<p><b>Android (use Chrome):</b></p>
<ol><li>Open app.ombgas.com in Chrome.</li><li>Tap the three dots at the top right.</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li></ol>` },

  { t: 'Starting a new record', k: 'new gas safety boiler service legionella air conditioning visit forms draft',
    h: `<p>On the <b>Records</b> screen tap the type of job you are doing:</p>
<ul><li><b>Gas safety record</b> (landlord gas safety check)</li><li><b>Boiler service record</b></li><li><b>Legionella risk assessment</b></li><li><b>Air conditioning commissioning</b></li></ul>
<p>The next screen lets you tick <b>everything you are doing at that property today</b>. The customer and address are entered once and shared across the forms, and you get a separate PDF for each.</p>
<p>Work through the steps using <b>Next</b> and <b>Back</b>. Your work is saved as you go. If you leave part way through it is kept as a <b>draft</b> on the home screen, and you can open it again or delete it.</p>` },

  { t: 'Choosing a customer and property', k: 'customer name suggestions address postcode landlord tenant property billing',
    h: `<p>On the first step, start typing the customer’s name. Suggestions appear from your saved customers. Tap one to fill in their details.</p>
<p>If the customer has saved properties, tap the property the work is being done at. Otherwise type the address. Each address has its own <b>postcode box</b>, and you do not need to type commas between lines.</p>
<p>New names are saved to <b>Customers</b> automatically so you will not have to type them again.</p>` },

  { t: 'Gas rate calculator and tightness timer', k: 'gas rate meter reading m3 ft3 timer stopwatch start stop tightness test pressure',
    h: `<p><b>Gas rate calculator</b></p>
<ol><li>On the appliance step tap <b>Gas rate calculator</b>.</li>
<li>Choose <b>Metric (m³)</b> or <b>Imperial (ft³)</b>.</li>
<li>Tap <b>Start</b> when you are ready. You do not have to enter any readings first.</li>
<li>Tap <b>Stop</b> when the test is done. The time fills in by itself.</li>
<li>Type the first and second meter readings (metric), or time one revolution of the test dial (imperial).</li>
<li>Tap <b>Use</b> to put the result into the form.</li></ol>
<p>The CV value is saved for next time.</p>
<p><b>Gas tightness test</b> has its own timer. Enter the start pressure, start the timer, and the time and result fill in for you. You can also type them in.</p>` },

  { t: 'Flue gas analyser readings', k: 'combustion analyser flue gas co co2 ratio results see below',
    h: `<p>If you used a combustion analyser, tick that you did and enter the readings in the <b>Flue gas analysis</b> section. On the PDF, the flue gas line in the operating checks then says <b>See results below (Combustion Analyser Readings)</b> and the readings are printed underneath.</p>` },

  { t: 'Photos and signatures', k: 'photo picture camera signature sign customer engineer',
    h: `<p>Where a step has a photo or signature box, tap it to add one. Signatures are drawn with your finger.</p>
<p>To save time you can save <b>your own signature</b> once, and it is added to future forms for you. Tick <b>Remember my signature</b> under the engineer signature box. After that, tap <b>Use my saved signature</b> if it is not added automatically. Untick it to remove the saved signature.</p>
<p>Photos and signatures are kept on your phone. They are included when you make a backup.</p>` },

  { t: 'Making the PDF and sending it', k: 'pdf certificate share email whatsapp download view open complete issue',
    h: `<p>On the last step, check the details and tap <b>Create documents</b> to make the PDFs. Any missing required answers are highlighted so you can go back and fix them.</p>
<p>Once it is made you can <b>view</b> it, then <b>share</b> or send it using your phone’s normal share options (email, WhatsApp, save to Files and so on).</p>
<p>Each form in a visit gets its own PDF. Completed records are listed under the customer, where you can open the PDF again at any time.</p>` },

  { t: 'Warning notices', k: 'warning notice immediately dangerous at risk defect unsafe appliance capped off',
    h: `<p>If you record a defect that needs a warning notice, the record shows <b>Warning notice required</b>. Tap <b>Fill in the warning notice</b> on the record to complete it. It makes its own PDF, separate from the certificate.</p>` },

  { t: 'Customers', k: 'customer list search favourite heart previous jobs add edit delete',
    h: `<p>The <b>Customers</b> tab lists everyone you have worked for.</p>
<ul><li>Use the search box to find a name, phone number, email or any address.</li>
<li>Sort by <b>A–Z</b>, <b>Most used</b> or <b>♥ Favourites</b>.</li>
<li>Tap <b>+ Customer</b> to add one. Tap a customer to see their details, properties and all their previous jobs.</li>
<li>From a customer you can start a new record for them straight away.</li></ul>
<p>Deleting a customer does not delete their past records.</p>` },

  { t: 'Invoices', k: 'invoice create new bill price line item vat discount sent paid due no invoice needed',
    h: `<p>When a record is complete it shows <b>Requires invoice</b> until you deal with it.</p>
<ol><li>On the last screen of a finished visit tap <b>Create invoice</b>, or start one from the <b>Invoices</b> tab.</li>
<li>Start typing the client name and tap a saved customer to fill in their details. Tap one of their saved properties for the address, or type a new one. Prices from Settings are filled in for you.</li>
<li>Tap <b>+ Add a line</b> for parts, call-out or extras. The cursor jumps to the new line.</li>
<li>Set the VAT rate (use 0 for no VAT). Enter prices excluding VAT.</li>
<li>Tap <b>View invoice (PDF)</b> to check it, then send it.</li></ol>
<p>Tap <b>Mark invoice as sent</b> when you send it, and mark it paid when the money arrives. If a job does not need an invoice, tap <b>Invoice not required</b> and the reminder goes away.</p>` },

  { t: 'Invoices for accountants and statements', k: 'accountant statement vat quarter print bulk export period report',
    h: `<p>On the <b>Invoices</b> tab, tap <b>Print for accountant (VAT quarter / bulk)</b>. Choose the period (for example a VAT quarter), what to include and the layout, then tap <b>Create PDF</b>.</p>` },

  { t: 'Backing up your data', k: 'backup restore password export import monthly reminder lost phone cloud drive',
    h: `<p>Your records live on your phone, so make a backup file regularly. The app reminds you once a month.</p>
<ol><li>Go to <b>Settings</b> and find <b>Backup</b>.</li>
<li>Tap <b>Back up everything</b>.</li>
<li>Choose a password if you want the file protected. <b>Keep the password safe: it cannot be recovered.</b></li>
<li>Save or share the file somewhere safe, such as your email, OneDrive or Google Drive.</li></ol>
<p>Bank details and your sync token are <b>not</b> included in the backup.</p>
<p>To restore, tap <b>Restore from a backup</b> in the same place and choose your backup file. Enter the password if you set one.</p>` },

  { t: 'Updating the app', k: 'update version old new latest refresh not updating reload cache',
    h: `<p>The app updates itself when it can, but you can force it:</p>
<ol><li>Go to <b>Settings</b>. The <b>App version</b> box is at the top.</li>
<li>Tap <b>Update app now</b>.</li></ol>
<p>It shows the version on your phone and the newest version online. Your records, customers and photos are not touched.</p>
<p>If you were told a new version is out and the number has not changed, wait a few minutes and try again.</p>` },

  { t: 'Working without signal and syncing', k: 'offline signal sync cloud dot not synced account login',
    h: `<p>The app works with no signal. Everything is saved on your phone first.</p>
<p>When you are signed in and online, changes are also saved to your account. A record shows <b>not synced</b> until that has happened. The small dot at the top right shows the sync status.</p>
<p>Before changing phone, make a backup so nothing is lost.</p>` },

  { t: 'Your subscription', k: 'subscribe subscription trial free price pay card cancel billing manage stripe £15',
    h: `<p>New accounts start with a <b>14-day free trial</b>. After that the app is £15 a month.</p>
<ul><li>Go to <b>Settings</b> and tap <b>Subscribe</b> (or <b>Manage subscription</b> once subscribed) to add or change your card or to cancel.</li>
<li>If a subscription ends, you can still view, download and export your records, but you cannot create or change them until you subscribe again.</li></ul>` },

  { t: 'Something is not working', k: 'problem error fix help stuck confirmation email junk spam contact support',
    h: `<ul><li><b>Old version showing:</b> Settings, then <b>Update app now</b>.</li>
<li><b>Confirmation email did not arrive:</b> check your junk or spam folder, then use the resend button on the sign-up screen.</li>
<li><b>A button looks greyed out:</b> a required answer on that step is missing. Look for the highlighted box.</li>
<li><b>Wrong details on a PDF:</b> fix them in Settings or the record, then tap <b>Re-create documents</b> on the last step.</li></ul>
<p>Still stuck, or got an idea? Go to <b>Settings</b> and tap <b>Send feedback</b> (or use the button at the bottom of this guide). You can also email <b>support@ombgas.com</b>.</p>` }
];

const helpMatch = (x, q) => !q || (x.t + ' ' + x.k + ' ' + x.h.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q);
function helpListHtml(q) {
  q = String(q || '').trim().toLowerCase();
  const hits = HELP.filter(x => helpMatch(x, q));
  if (!hits.length) return '<div class="empty">Nothing found. Try a shorter word, for example “invoice” or “backup”.</div>';
  return hits.map(x => `<details class="hlp"${q && hits.length <= 3 ? ' open' : ''}><summary>${x.t}</summary><div class="hlpb">${x.h}</div></details>`).join('');
}
