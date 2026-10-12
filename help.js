/* In-app help guide. Plain topics, searchable, works offline.
   Each topic: t = title, k = extra search words, h = html (kept simple: paragraphs, numbered steps, bullets). */
const HELP = [
  { t: 'Getting started: set up your details first', k: 'setup first time business address gas safe number engineer signature logo settings tabs',
    h: `<p>Do this once, before your first certificate. Everything you enter here is printed on your PDFs.</p>
<p>Settings is split into tabs across the top: <b>Business</b>, <b>Invoicing</b>, <b>Quotes</b>, <b>Reminders</b>, <b>Calendar</b>, <b>Tools</b> and <b>App</b>.</p>
<ol><li>Tap the <b>cog</b> at the top right, next to the <b>?</b> button.</li>
<li>On the <b>Business</b> tab, fill in your business name, address, telephone, email and Gas Safe Register number.</li>
<li>Still on <b>Business</b>, add your <b>bank details</b> (printed on invoices), your <b>company logo</b> under Your branding, your <b>Gas Safe logo</b> and your <b>Engineer</b> name and Gas Safe ID.</li>
<li>On the <b>Invoicing</b> tab, set your invoice number, VAT and payment terms, and enter what you normally charge under <b>Prices</b> so invoices fill in for you.</li></ol>
<p>Until the business address, Gas Safe number and engineer details are filled in, the home screen shows a yellow reminder.</p>
<p><b>Your logo:</b> pick a file and the app trims the edges and sizes it to fill the square. Under the logo, <b>Logo background</b> lets you choose a White, Black or Clear tile behind it.</p>` },

  { t: 'Put the app on your phone’s home screen', k: 'install icon add to home screen iphone android safari chrome app',
    h: `<p>Installing it makes the app open full screen like any other app, and it keeps working with no signal.</p>
<p><b>iPhone (use Safari):</b></p>
<ol><li>Open app.ombgas.com in Safari.</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
<p><b>Android (use Chrome):</b></p>
<ol><li>Open app.ombgas.com in Chrome.</li><li>Tap the three dots at the top right.</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li></ol>` },

  { t: 'Starting a new record', k: 'new gas safety boiler service legionella air conditioning quote visit forms draft hide records',
    h: `<p>On the <b>Services</b> screen tap the type of job you are doing:</p>
<ul><li><b>Gas safety record</b> (landlord gas safety check)</li><li><b>Boiler service record</b></li><li><b>Legionella risk assessment</b></li><li><b>Air conditioning commissioning</b></li><li><b>Boiler quote</b> (see <i>Boiler quotes</i>)</li></ul>
<p>Not doing air conditioning yet? Hide any you do not use in <b>Settings → App → Services to show</b>. Turn them back on whenever you like.</p>
<p>The next screen lets you tick <b>everything you are doing at that property today</b>. The customer and address are entered once and shared across the forms, and you get a separate PDF for each. Tap <b>Start</b> to begin, or <b>Schedule in</b> to book the job in the calendar for later.</p>
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

  { t: 'Tools', k: 'tools calculator gas rate pipe sizing heat loss radiator tightness test volume report pdf hide',
    h: `<p>Tap <b>Tools</b> at the bottom for the calculators: gas rate, gas pipe sizing, tightness test volume (IGEM/UP/1B Edition 4) and room-by-room heat loss with radiator sizes.</p>
<ul><li>Tap the heart to pin a calculator to the top. The ones you use most move up.</li>
<li>Tick <b>Same property</b> and results carry from one calculator to the next.</li>
<li><b>Show workings out</b> explains each step of the sums.</li>
<li>From a customer’s card, tap <b>Tools and calculation report</b> to make a PDF of the results with their details on top. Tick which results go in.</li>
<li>Hide tools you do not use in <b>Settings → Tools</b>.</li></ul>` },

  { t: 'Flue gas analyser readings', k: 'combustion analyser flue gas co co2 ratio results see below',
    h: `<p>If you used a combustion analyser, tick that you did and enter the readings in the <b>Flue gas analysis</b> section. On the PDF, the flue gas line in the operating checks then says <b>See results below (Combustion Analyser Readings)</b> and the readings are printed underneath.</p>` },

  { t: 'Photos and signatures', k: 'photo picture camera signature sign customer engineer',
    h: `<p>Where a step has a photo or signature box, tap it to add one. Signatures are drawn with your finger.</p>
<p>To save time you can save <b>your own signature</b> once, and it is added to future forms for you. Tick <b>Remember my signature</b> under the engineer signature box. After that, tap <b>Use my saved signature</b> if it is not added automatically. Untick it to remove the saved signature.</p>
<p>Photos and signatures are kept on your phone. They are included when you make a backup.</p>` },

  { t: 'Making the PDF and sending it', k: 'pdf certificate share email whatsapp download view open complete issue computer mac windows outlook edit documents',
    h: `<p>On the last step, check the details and tap <b>Create documents</b> to make the PDFs. Any missing required answers are highlighted so you can go back and fix them.</p>
<p>Once it is made you can <b>view</b> it, then <b>share</b> or send it using your phone’s normal share options (email, WhatsApp, save to Files and so on).</p>
<p>Each form in a visit gets its own PDF. Completed records are listed under the customer. Open one and the button says <b>Open documents</b>, because they are already made. Tap <b>Edit</b> next to <b>Open</b> to go back in and change a finished record, then make the PDF again.</p>
<p><b>On a computer:</b> sharing saves the PDF and shows a short box of steps: open your email (it opens in a new tab), then drag the PDF in from your Downloads folder. Set your default email program in your computer’s settings if the wrong one opens.</p>` },

  { t: 'Boiler quotes', k: 'quote quotation any job bathroom radiator boiler proposal chase accepted declined price extras labour warranty',
    h: `<p><b>Quotes for other work:</b> tap <b>+ New Quote (any job)</b> for a bathroom, radiators, repairs or anything else. Give the job a title and what is included (or pick <b>Start from a previous job</b> to bring in the title, what is included, items and prices from an earlier quote), then add items from your price list or your own items, and labour. You get a quotation PDF with your logo, and the Accepted / Declined and chase reminders work the same way. You can hide this button in Settings.</p>
<p>For a boiler, tap <b>+ New Boiler Quote</b> on the home screen, pick the customer, then work through the steps: the boiler and flue, extras and labour. The app works out the VAT and makes a three-page proposal PDF with your logo, the price up front, what is included, what happens next and a place for the customer to sign.</p>
<ul><li>Pick boilers and extras from your <b>Price list</b>. The manufacturer warranty fills in from the boiler you pick.</li>
<li>Type an item and price that is not on the list and tick <b>Commit to price list</b> to save it for next time.</li>
<li>Choose <b>Normal</b> or <b>Large</b> text at the bottom of the extras step for older customers.</li></ul>
<p>A finished quote shows <b>Awaiting reply</b>. Tick <b>Accepted</b> or <b>Declined</b> when you hear. After 14 days with no answer it turns red as <b>Chase up</b>, the home screen tells you, and <b>Chase by email</b> and <b>Chase by text</b> open a ready-written message. Change that wording in <b>Settings → Quotes</b>.</p>` },

  { t: 'Price list', k: 'price list cost mark-up markup boiler make model brand category tabs warranty add',
    h: `<p>Find it in <b>Settings → Quotes → Price list</b>. Items are in categories (Boiler, Flue, Labour, Copper and pipe, Fittings, Controls and more). Tap a category to open it and see its items. Labour has no make or model: give each rate a name such as Hourly rate or Day rate and say what it is charged per, then on a quote enter how many hours or days. Tap <b>+ New category</b> to add your own, such as Baths, Toilets or Taps, then add items to it, shown as tabs in one row. Swipe along and tap one.</p>
<ul><li>Give each item your <b>cost</b> and a <b>mark-up %</b>. Set one standard mark-up, one per category, or one per item, and the sale price works itself out. You can also type a fixed price.</li>
<li>On the <b>Boiler</b> tab you see the makes first. Tap a make to see its models. Use <b>+ Add a boiler</b> or <b>+ Add a make</b> to add your own.</li>
<li>Boilers can carry a warranty length, which fills in on the quote.</li></ul>` },

  { t: 'Warning notices', k: 'warning notice immediately dangerous at risk defect unsafe appliance capped off',
    h: `<p>If you record a defect that needs a warning notice, the record shows <b>Warning notice required</b>. Tap <b>Fill in the warning notice</b> on the record to complete it. It makes its own PDF, separate from the certificate.</p>` },

  { t: 'Annual check reminders', k: 'reminder due annual renewal gas safety service text whatsapp email overdue booked chase landlord',
    h: `<p>Gas safety checks, boiler services and Legionella assessments are all tracked yearly. The app keeps track for you.</p>
<ol><li>Tap <b>Calendar</b> on the bottom bar, then <b>Due</b>. The number shows how many are coming up. (If you have switched the calendar off, it is the <b>Annual checks due</b> button on the Services screen.)</li>
<li>Each customer shows when their check is due (or how many days overdue).</li>
<li>Tap <b>Text</b>, <b>WhatsApp</b> or <b>Email</b>. Your phone opens a message that is already written, using their number or email. Check it, then press send. Nothing is ever sent without you.</li>
<li>When they reply, tap <b>Booked in</b> or <b>Not needed</b> to take them off the list. Tap <b>Stop for this property</b> if they should never be reminded.</li></ol>
<p><b>Automatic emails:</b> in <b>Settings → Reminders</b>, under <b>Annual check reminders</b>, set <b>Send reminders automatically by email</b> to On. Customers who have an email address saved are emailed about 8 weeks before the check is due, and again 2 weeks before, from reminders@ombgas.com with your business name on it. Their replies come to the email address in your Settings. Tap <b>Send me a sample reminder</b> to see exactly what they get. Customers marked <b>Booked in</b>, <b>Not needed</b> or <b>Stop</b> are skipped, and so is anyone you tick <b>Never send reminder emails</b> for on their customer page. Every email has an unsubscribe link. You need to be signed in for this to run.</p>
<p>The list uses the “next check due” date on your completed gas safety, boiler service and Legionella records. In <b>Settings → Reminders</b> you can change the wording of the message and how many weeks early they show. Which ones you have reminded is kept on this phone.</p>` },

  { t: 'Customers', k: 'customer list search favourite heart previous jobs add edit delete navigate tabs map directions',
    h: `<p>Customer names get a capital letter on each word for you (jane smith becomes Jane Smith). The <b>Customers</b> tab lists everyone you have worked for.</p>
<ul><li>Use the search box to find a name, phone number, email, address, invoice number or certificate number.</li>
<li>Sort by <b>A–Z</b>, <b>Most used</b> or <b>♥ Favourites</b>.</li>
<li>Tap <b>+ Customer</b> to add one.</li></ul>
<p>Tap a customer to open their card. It has three tabs:</p>
<ul><li><b>Customer:</b> their name, phone (with a Call button), email, billing address and property addresses. Start forms or tools for them from here.</li>
<li><b>Navigate:</b> one tap on a property opens it in maps for directions.</li>
<li><b>Previous jobs:</b> their upcoming appointments, saved reports, and every job you have done for them.</li></ul>
<p>Deleting a customer does not delete their past records.</p>` },

  { t: 'Calendar and appointments', k: 'calendar diary appointment booking schedule today schedule in export ics sync other job',
    h: `<p>The calendar keeps your appointments in the app. Today’s appointments sit on the Services screen under the service buttons, and the <b>Calendar</b> tab on the bottom bar has the Today, Week and Month views.</p>
<p><b>Book a job in:</b></p>
<ol><li>Tap a job type (for example Gas Safety Record), then tap <b>Schedule in</b> under Start. Or tap <b>+ Schedule an appointment</b> on the home screen, or <b>+ Appointment</b> inside the calendar.</li>
<li>Tick the job or jobs. <b>Other job</b> opens a box to type what it is, with quick buttons for jobs you have saved.</li>
<li>Set the date, start time and how long.</li>
<li>Pick a customer to fill in their details. The address of the job is a list of their saved addresses, with <b>+ Add a new address</b> at the bottom.</li>
<li>Tap <b>Add to calendar</b>.</li></ol>
<p><b>Using the calendar:</b> tap <b>Calendar</b> on the bottom bar for the <b>Today</b> view (today’s appointments and the week ahead), the <b>Week</b> view and the <b>Month</b> view. Tap a day on the month to see it. Tap an appointment to edit it, at the top tap <b>Text: I’m on my way</b> to open a ready-written text to the customer (you press send; it only shows when the customer has a mobile number), or <b>Navigate to</b> to open the address in maps, <b>Start the forms for this job</b> (the customer and address are filled in), <b>Mark as done</b>, add it to your phone’s calendar or delete it. It warns you if two appointments clash.</p>
<p><b>Settings → Calendar:</b> switch the whole calendar <b>On</b> or <b>Off</b> (off removes it from the app and keeps your saved appointments), choose which view the calendar opens on (today, week or month), show or hide it on the home screen, set your usual appointment length, change the wording of the on my way text, add or remove your <b>Other jobs</b> list (bathroom install, radiator install and so on), <b>import</b> appointments from another calendar (an .ics file: in Google Calendar use Settings → Import &amp; export → Export and unzip it; in Apple Calendar on a Mac use File → Export), and export every appointment as an <b>.ics</b> file (Google, Apple or Outlook calendar) or a spreadsheet.</p>
<p>Appointments sync between every device you are signed in on. If one is missing, open the calendar and tap <b>Sync now</b>.</p>
<p><b>Today, Week and Month:</b> use the buttons at the top of the calendar. The week view lists each day with an <b>+ Add</b> button. To move an appointment, open it and change the date or time, then <b>Save changes</b>.</p>
<p><b>Remind customers:</b> tomorrow’s appointments show under <b>Tomorrow: remind customers</b> with <b>Text</b> and <b>Email</b> buttons. Your messaging app opens with the message ready and you tap send. Tap <b>Text next customer</b> to open each customer’s message in turn: send it, come back, and tap again. Change the wording or switch it off in Settings → Calendar.</p>
<p><b>Annual checks:</b> the <b>Due</b> button next to Today, Week and Month lists them. On each due check, <b>Book it in</b> opens a booking for that customer, address and job. Saving it marks the check as booked in.</p>` },

  { t: 'Invoices', k: 'invoice create new bill price line item vat discount sent paid due no invoice needed overdue reminder',
    h: `<p>Tap <b>Sales</b> on the bottom bar. It has two tabs at the top: <b>Invoices</b> and <b>Quotes</b>. The Quotes tab lists every quote you have made, shows how much is waiting for an answer, and lets you start a new one.</p>
<p>When a record is complete it shows <b>Requires invoice</b> until you deal with it.</p>
<ol><li>On the last screen of a finished visit tap <b>Create invoice</b>, or start one from the <b>Invoices</b> tab.</li>
<li>Start typing the client name and tap a saved customer to fill in their details. Tap one of their saved properties for the address, or type a new one. Prices from Settings are filled in for you.</li>
<li>Tap <b>+ Add a line</b> for parts, call-out or extras. The cursor jumps to the new line. Or tap <b>+ Add from my price list</b>, search, and tap an item to add it at its sale price.</li>
<li>Set the VAT rate (use 0 for no VAT). Enter prices excluding VAT.</li>
<li>Tap <b>View invoice (PDF)</b> to check it, then send it.</li></ol>
<p>The <b>Paid</b> tick is at the top of the invoice, under the View invoice button. Tap <b>Mark invoice as sent</b> when you send it. If a job does not need an invoice, tap <b>Invoice not required</b> and the reminder goes away.</p>` },

  { t: 'Overdue invoices and payment reminders', k: 'overdue unpaid late payment reminder chase snooze invoice email',
    h: `<p>The day after an invoice passes its payment terms, the home screen asks if you want to send a payment reminder.</p>
<ul><li><b>Yes:</b> your email opens with a reminder written and the invoice attached. Check it and press send. Nothing is sent without you.</li>
<li><b>No:</b> it asks if the invoice has been paid, or to ask again in 7 days.</li></ul>
<p>Any unpaid invoice also has a <b>Send payment reminder</b> button. On the <b>Invoices</b> tab, tap <b>Overdue</b> to see only the late ones (it appears once something is overdue). Change the wording, or turn the prompt off, in <b>Settings → Invoicing → Payment reminders</b>.</p>` },

  { t: 'Invoices for accountants and statements', k: 'accountant statement vat quarter print bulk export period report',
    h: `<p>On the <b>Invoices</b> tab, tap <b>Print for accountant (VAT quarter / bulk)</b>. Choose the period (for example a VAT quarter), what to include and the layout, then tap <b>Create PDF</b>.</p>` },

  { t: 'Backing up your data', k: 'backup restore password export import monthly reminder lost phone cloud drive',
    h: `<p>Your records live on your phone and are also saved to your account, but keep a backup file too. The app reminds you once a month.</p>
<ol><li>Go to <b>Settings → App</b> and find <b>Backup</b>.</li>
<li>Tap <b>Back up everything</b>.</li>
<li>Choose a password if you want the file protected. <b>Keep the password safe: it cannot be recovered.</b></li>
<li>Save or share the file somewhere safe, such as your email, OneDrive or Google Drive.</li></ol>
<p>The backup holds your customers, records, invoices, appointments and photos. Bank details and your sync token are <b>not</b> included.</p>
<p>To restore, tap <b>Restore from a backup</b> in the same place and choose your backup file. Enter the password if you set one.</p>` },

  { t: 'Updating the app', k: 'update version old new latest refresh not updating reload cache',
    h: `<p>The app updates itself when it can, but you can force it:</p>
<ol><li>Go to <b>Settings → App</b>. The <b>App version</b> box is there.</li>
<li>Tap <b>Update app now</b>.</li></ol>
<p>It shows the version on your phone and the newest version online. Your records, customers and photos are not touched.</p>
<p>If you were told a new version is out and the number has not changed, wait a few minutes and try again. Update every device you use so they all match.</p>` },

  { t: 'Working without signal and syncing', k: 'offline signal sync cloud dot not synced account login devices desktop phone calendar',
    h: `<p>The app works with no signal. Everything is saved on your phone first.</p>
<p>When you are signed in and online, changes are also saved to your account, and shared with every other device you are signed in on, such as a phone and a computer. That includes customers, records, invoices and calendar appointments. A record shows <b>not synced</b> until that has happened. The small dot at the top right shows the sync status.</p>
<p>It syncs when you open the app and when you save. To sync straight away tap <b>Sync now</b> in <b>Settings → App</b> or on the calendar. Make sure every device is on the newest version.</p>
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
