/* What's new: plain-English notes, newest first. Add one entry per version. */
const NEWS = [
  { v: 'v59', items: ['New: Annual checks due. A button on the Records screen lists gas safety checks and boiler services coming up, or overdue.', 'Tap Text, WhatsApp or Email and the reminder opens on your phone ready to send, using the customer’s details. Nothing is sent without you pressing send.', 'Mark each one Booked in or Not needed, or stop reminders for a property. Change the wording and how early they show in Settings.'] },
  { v: 'v58', items: ['Help guide added. Tap the ? at the top of any screen, or find it in Settings.', 'This What’s new list.', 'Invoices: start typing a client name and matching customers appear. Tap one to fill in their details.', 'Invoices: tap a saved property for that customer, or start typing an address to see saved ones.', 'Send feedback: report a fault, make a suggestion or ask a question from Settings or the Help guide.'] },
  { v: 'v57', items: ['The gas rate timer can now be started before any meter readings are entered.', 'Adding a line to an invoice no longer jumps to the bottom. You stay where you are and the new line is ready to type in.'] },
  { v: 'v56', items: ['You can now open and view an invoice PDF from a customer’s record and from the ready-to-send box, not just edit it.'] },
  { v: 'v55', items: ['Addresses no longer end up with double commas on invoices.', 'Every address now has its own postcode box.'] },
  { v: 'v54', items: ['Boiler service PDF: the flue gas line now says “See results below (Combustion Analyser Readings)”.'] },
  { v: 'v53', items: ['Boiler service PDF: the column once called “Failure details” is now “Further information”.'] },
  { v: 'v52', items: ['“Update app now” is more reliable. It clears the saved copy and loads the newest version.'] },
  { v: 'v51', items: ['The App version box and Update app now button are now at the top of Settings.'] },
  { v: 'v50', items: ['Boiler service: the system filter questions now come after the appliance checks, so the form flows better.'] },
  { v: 'v48', items: ['Backups can now be protected with a password.', 'Bank details are left out of backup files.'] },
  { v: 'v47', items: ['A monthly reminder to back up your data.'] },
  { v: 'v46', items: ['If your sign-up email does not arrive, there is now a resend button.'] }
];
function newsHtml(n) {
  return NEWS.slice(0, n || NEWS.length).map(x => `<div class="card"><div class="t" style="margin-bottom:6px">${x.v}</div><ul style="margin:0;padding-left:20px">${x.items.map(i => `<li style="margin-bottom:6px">${i}</li>`).join('')}</ul></div>`).join('');
}
