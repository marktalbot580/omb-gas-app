/* What's new: plain-English notes, newest first. Add one entry per version. */
const NEWS = [
  { v: 'v69', items: ['You can now hide any of the Tools you do not use, in Settings.'] },
  { v: 'v68', items: ['In Tools, tap the heart to pin a calculator to the top.'] },
  { v: 'v67', items: ['In Tools, the calculators you use most move to the top.'] },
  { v: 'v66', items: ['New Tools section on the home screen: gas rate calculator, gas pipe sizing, and room-by-room heat loss with radiator sizes that change with your flow and return temperatures.','Customer search now finds invoice numbers and certificate numbers too.'] },
  { v: 'v65', items: ['The line on Annual checks due now reads "Reminder sent by email" instead of "Emailed automatically".'] },
  { v: 'v64', items: ['Annual checks due now shows "Reminder sent by email" with the date when an automatic reminder has gone to a customer.'] },
  { v: 'v63', items: ['The Annual checks due page now says whether automatic emails are on, so you know if you need to send anything yourself.'] },
  { v: 'v62', items: ['Legionella risk assessments now appear in Annual checks due, and in the automatic reminder emails, using the next assessment date on the record.'] },
  { v: 'v61', items: ['The Annual checks due button on the home screen now matches the other buttons.'] },
  { v: 'v60', items: ['Automatic reminder emails. Turn them on in Settings and customers with an email address get a reminder about 8 weeks before their gas check or boiler service is due, and again at 2 weeks.', 'Replies come to your own email. Every email has an unsubscribe link, and you can switch it off for any customer.', 'Booked in, Not needed and Stop now sync between your devices and stop the automatic emails too.', 'Fixed: editing a customer no longer removes their favourite heart.'] },
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
