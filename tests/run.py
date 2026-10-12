"""OMB Gas Service - end-to-end test suite.

Run:  python3 -m http.server 8765 &   then   python3 tests/run.py
Needs: pip install playwright && playwright install chromium
Every check prints PASS/FAIL; the exit code is 1 if anything failed.
"""
import json, re, sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/'
results = []


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if (info and not ok) else ''))


def fresh(browser, mobile=False):
    ctx = browser.new_context(viewport={'width': 390, 'height': 800}, accept_downloads=True,
                              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' if mobile else None)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(URL)
    pg.evaluate('localStorage.clear()')
    pg.reload()
    pg.evaluate("document.querySelector('#gate') && document.querySelector('#gate').remove()")
    pg.evaluate("settings.businessName='Coutts Heating'; settings.address='1 Test Road\\nLincoln\\nLN1 1AA'; settings.gasSafeReg='123456'; settings.engineerName='K Coutts'; settings.gasSafeId='7654321'; saveSettings()")
    return ctx, pg, errs


def ev(pg, js):
    return pg.evaluate(js)


def run():
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ---------- 1. every screen renders ----------
        ctx, pg, errs = fresh(b)
        views = ['home', 'customers', 'invoices', 'settings', 'tools', 'help', 'news', 'feedback', 'due', 'cal']
        for v in views:
            ok = ev(pg, f"(()=>{{ui.view='{v}';try{{render();return document.querySelector('#view').innerText.length>10}}catch(e){{return String(e)}}}})()")
            check(f'view renders: {v}', ok is True, ok)
        for t in ['business', 'invoicing', 'quotes', 'reminders', 'calendar', 'tools', 'app']:
            ok = ev(pg, f"(()=>{{ui.view='settings';ui.sTab='{t}';render();const d=document.querySelector('[data-stab={t}]');return !!d&&!d.hidden&&d.innerText.length>10}})()")
            check(f'settings tab shows: {t}', ok)
        only = ev(pg, "(()=>{ui.view='settings';ui.sTab='invoicing';render();return [...document.querySelectorAll('[data-stab]')].filter(d=>!d.hidden).length})()")
        check('settings shows exactly one tab at a time', only == 1, only)
        check('app version matches service worker cache',
              ev(pg, "fetch('sw.js').then(r=>r.text()).then(t=>t.includes(\"'omb-gas-\"+APP_VERSION+\"'\"))"))
        check('news has an entry for the current version', ev(pg, 'NEWS[0].v === APP_VERSION'))
        check('no page errors while rendering views', not errs, errs)
        ctx.close()

        # ---------- 2. every PDF type builds ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        n = ev(pg, 'records.length')
        check('sample data adds records', n >= 5, n)
        for t in ['gas', 'service', 'legionella', 'aircon', 'warning']:
            r = ev(pg, f"(async()=>{{const rec=records.find(r=>typeOf(r)==='{t}');if(!rec)return 'no record';try{{const b=await buildPdf(rec,settings);return b.size>3000?true:'tiny '+b.size}}catch(e){{return String(e)}}}})()")
            check(f'PDF builds: {t}', r is True, r)
        for t in ['quote', 'commission']:
            r = ev(pg, f"(async()=>{{try{{const rec=newRecord(customers[0],'{t}');const b=await buildPdf(rec,settings);return b.size>3000?true:'tiny '+b.size}}catch(e){{return String(e)}}}})()")
            check(f'PDF builds: {t} (blank form)', r is True, r)
        r = ev(pg, "(async()=>{try{const i=newInvoice([records[0]]);i.lines=[{d:'Service',q:'1',p:'80'}];const b=await buildInvPdf(i,settings);return b.size>3000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: invoice', r is True, r)
        r = ev(pg, "(async()=>{try{const i=newInvoice([records[0]]);i.lines=[{d:'Service',q:'1',p:'80'}];invoices.push(i);const b=await buildStatementPdf(invoices,settings,{});return b.size>2000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: accountant statement', r is True, r)
        r = ev(pg, "(async()=>{try{const b=await buildToolsPdf([],{},settings);return b.size>1000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: tools report', r is True, r)
        for color, label in [('white', 'white'), ('black', 'black'), ('clear', 'clear')]:
            r = ev(pg, f"(async()=>{{settings.logoBg='{color}';_logoW={{k:'',v:''}};try{{const u=await getLogo();return u.length>50}}catch(e){{return String(e)}}}})()")
            check(f'logo background option works: {label}', r is True, r)
        check('no page errors while building PDFs', not errs, errs)
        ctx.close()

        # ---------- 3. records: create from the UI, validation, drafts ----------
        ctx, pg, errs = fresh(b)
        pg.click('[data-act=newRec][data-type=gas]')
        check('new record opens the forms picker', ev(pg, "ui.view==='pick'"))
        pg.click('[data-act=pickGo]')
        check('Start opens the form', ev(pg, "ui.view==='form'"))
        check('a draft record is stored', ev(pg, "records.length===1 && records[0].status==='draft'"))
        ev(pg, "ui.view='home';render()")
        check('draft shows on the home screen', ev(pg, "document.querySelectorAll('[data-act=openRec]').length===1"))
        ev(pg, "records.length=0;saveRecords()")
        check('no page errors in record flow', not errs, errs)
        ctx.close()

        # ---------- 4. customers ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "customers.push({id:'c1',name:'Jane Smith',phone:'07700900123',email:'j@x.com',billing:'',properties:['1 High St\\nLincoln\\nLN1 1AA','2 Low Rd\\nGrantham\\nNG31 1AA']});ui.view='customers';render()")
        check('customer list shows the customer', 'Jane Smith' in ev(pg, "document.querySelector('#view').innerText"))
        pg.fill('#custSearch', 'zzz'); pg.dispatch_event('#custSearch', 'input')
        check('customer search filters', 'Jane Smith' not in ev(pg, "document.querySelector('#custList').innerText"))
        pg.fill('#custSearch', 'jane'); pg.dispatch_event('#custSearch', 'input')
        check('customer search finds a match', 'Jane Smith' in ev(pg, "document.querySelector('#custList').innerText"))
        ev(pg, "ui.cust=JSON.parse(JSON.stringify(customers[0]));ui.cTab='cust';ui.view='custEdit';render()")
        for tab in ['cust', 'nav', 'jobs']:
            pg.click(f'[data-act=cTab][data-t={tab}]')
            shown = ev(pg, "[...document.querySelectorAll('[data-ctab]')].filter(d=>!d.hidden).map(d=>d.dataset.ctab)")
            check(f'customer tab shows only {tab}', shown == [tab], shown)
        check('navigate tab links to maps', ev(pg, "document.querySelectorAll('[data-ctab=nav] a[href*=\\'google.com/maps\\']').length===2"))
        ev(pg, "ui.cust={_new:true,id:'n',name:'',phone:'',email:'',billing:'',properties:[]};ui.view='custEdit';render()")
        check('new customer has no tab bar', ev(pg, "document.querySelectorAll('[data-act=cTab]').length===0"))
        check('no page errors in customers', not errs, errs)
        ctx.close()

        # ---------- 5. invoices ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.payDays='14';const i=newInvoice(null);i.customer.name='Bob';i.lines=[{d:'Boiler service',q:'1',p:'100'},{d:'Part',q:'2',p:'10'}];i.vatRate='20';persistInv(i);ui.inv=i;ui.view='invEdit';render()")
        check('invoice total includes VAT', '144' in ev(pg, "document.querySelector('#invTotals').innerText"), ev(pg, "document.querySelector('#invTotals').innerText"))
        ev(pg, "invoices[0].due='2000-01-01';invoices[0].paid=false;saveInvoices()")
        check('overdue invoice is detected', ev(pg, "invOverdueAsk().length===1"))
        ev(pg, "invoices[0].paid=true;saveInvoices()")
        check('paid invoice is not overdue', ev(pg, "invOverdueAsk().length===0"))
        ev(pg, "ui.view='home';render()")
        check('no page errors in invoices', not errs, errs)
        ctx.close()

        # ---------- 6. quotes and price list ----------
        ctx, pg, errs = fresh(b)
        check('quote price list has boilers', ev(pg, "(settings.qList&&settings.qList.length>20)||QUO.STARTER.length>20"))
        ev(pg, "ui.view='prices';render()")
        check('price list view renders', ev(pg, "document.querySelector('#view').innerText.length>50"))
        ev(pg, "const q=newRecord(null,'quote');q.status='complete';q.qStatus='';q.inspectionDate='2000-01-01';q.customer={name:'Ann Lee',phone:'07700900111',email:'a@x.com'};records.push(q)")
        check('old unanswered quote needs chasing', ev(pg, "records.filter(qChase).length===1"))
        check('chase text fills the name', 'Hi Ann' in ev(pg, "chaseText(records[0])"))
        check('no page errors in quotes', not errs, errs)
        ctx.close()

        # ---------- 7. tools ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.view='tools';render()")
        check('tools screen lists calculators', ev(pg, "document.querySelector('#view').innerText.length>60"))
        check('no page errors in tools', not errs, errs)
        ctx.close()

        # ---------- 8. calendar ----------
        ctx, pg, errs = fresh(b, mobile=True)
        ev(pg, "customers.push({id:'c1',name:'Jane Smith',phone:'07700 900123',email:'',billing:'',properties:['1 High St\\nLincoln\\nLN1 1AA','2 Low Rd\\nGrantham\\nNG31 1AA']},{id:'c2',name:'Janet Brown',phone:'01522 123456',email:'',billing:'',properties:[]});render()")
        check('home shows Today and the month calendar', ev(pg, "!!document.querySelector('.calg') && /today/i.test(document.querySelector('#view').innerText)"))
        pg.click('[data-act=newRec][data-type=gas]'); pg.click('[data-act=bookFromPick]')
        check('Schedule in opens the booking form with the job ticked', ev(pg, "ui.view==='book' && ui.book.types.join()==='gas'"))
        pg.click('[data-bk=name]'); pg.keyboard.type('jan', delay=20)
        check('customer search suggests matches', ev(pg, "document.querySelectorAll('#bkNameSug .cpick').length===2"))
        pg.fill('[data-bk=name]', 'Jane Sm'); pg.dispatch_event('[data-bk=name]', 'input')
        pg.click('#bkNameSug .cpick')
        check('picking a customer fills the details', ev(pg, "ui.book.customerId==='c1' && ui.book.phone==='07700 900123'"))
        check('address list offered with an add-new option', ev(pg, "[...document.querySelectorAll('select[data-bk=propPick] option')].some(o=>o.value==='__new')"))
        pg.select_option('[data-bk=propPick]', '1')
        check('choosing a saved address sets it', ev(pg, "ui.book.address.startsWith('2 Low Rd')"))
        pg.select_option('[data-bk=propPick]', '__new')
        pg.fill('textarea[data-bk=address]', '9 New Way\nBoston\nPE21 1AA')
        pg.fill('[data-bk=date]', ev(pg, 'localISO()')); pg.fill('[data-bk=time]', '10:30')
        pg.click('[data-act=bookSave]')
        check('booking saves', ev(pg, "bookings.length===1 && bookings[0].time==='10:30'"))
        check('new address is saved on the customer', ev(pg, "customers[0].properties.length===3"))
        pg.click('[data-act=bookNew]'); pg.click('[data-act=bookType][data-t=other]')
        check('Other job opens a box', ev(pg, "!!document.querySelector('[data-bk=other]')"))
        pg.click('[data-act=bookOther][data-i="0"]'); pg.fill('[data-bk=name]', 'Bob'); pg.fill('[data-bk=time]', '10:45')
        pg.click('[data-act=bookSave]')
        check('overlapping booking is allowed after confirming', ev(pg, "bookings.length===2"))
        check('other job label uses what was chosen', ev(pg, "bkLabel(bookings[1])==='Bathroom install'"))
        ev(pg, "ui.view='home';render()")
        check('Today list shows today appointments', ev(pg, "document.querySelectorAll('[data-act=bookOpen]').length>=2"))
        pg.click('[data-act=bookOpen]')
        check('open booking has the on my way button for a mobile', ev(pg, "(()=>{const e=document.querySelector('#bkOtw');return !!e&&e.offsetParent!==null})()"))
        check('open booking has a Navigate button', ev(pg, "!!document.querySelector('a[href*=\"google.com/maps\"]')"))
        pg.fill('[data-bk=phone]', '01522 123456')
        check('landline hides the on my way button', ev(pg, "document.querySelector('#bkOtw').offsetParent===null"))
        check('mobile number formats are recognised', ev(pg, "['07700 900123','+44 7700 900123','+44 (0)7700 900123','(07700) 900123'].every(isMobileNo) && !isMobileNo('01522 123456')"))
        check('on my way text fills the name and time', ev(pg, "/^Hi Jane.*10:30/s.test(otwText({name:'Jane Smith',time:'10:30'}))"))
        ics = ev(pg, 'icsFor(bookings)')
        check('ICS export is valid', ics.startswith('BEGIN:VCALENDAR') and ics.count('BEGIN:VEVENT') == 2 and ics.rstrip().endswith('END:VCALENDAR'))
        check('CSV export has a header and rows', ev(pg, "bkCsv().split('\\r\\n').length===3"))
        pg.click('[data-act=bookStart]')
        check('Start the forms creates a record with the address', ev(pg, "ui.view==='form' && (ui.rec.jobAddress||'').length>3 && bookings.some(b=>b.status==='done')"))
        ev(pg, "settings.calOn='off';ui.view='home';render()")
        check('calendar off hides it from the home screen', ev(pg, "!document.querySelector('.calg') && !document.querySelector('[data-act=bookNew]')"))
        pg.click('[data-act=newRec][data-type=gas]')
        check('calendar off hides Schedule in', ev(pg, "!document.querySelector('[data-act=bookFromPick]')"))
        ev(pg, "settings.calOn='on';settings.calHome='off';ui.view='home';render()")
        check('home screen option hides just the home calendar', ev(pg, "!document.querySelector('.calg')"))
        check('no page errors in the calendar', not errs, errs)
        ctx.close()

        # ---------- 9. cloud sync handling (no network) ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{
          // an appointment pulled from the account must go into bookings, never into invoices
          const row={kind:'booking',id:'bk9',data:{id:'bk9',date:'2026-10-12',time:'09:00',types:['gas'],name:'X',updated:5},updated:5,deleted:false};
          return typeof CLOUD==='object' && typeof CLOUD.sync==='function';
        })()""")
        check('cloud module loads', r)
        src = open('cloud.js').read()
        check('cloud sync handles bookings (push, pull, delete)',
              "kind: 'booking'" in src and "d.kind === 'booking'" in src and 'saveBookings()' in src)
        ev(pg, "localStorage.setItem('omb_invoices',JSON.stringify([{id:'bk1',date:'2026-10-12',time:'09:00',types:['gas']},{id:'i1',lines:[{d:'x',q:'1',p:'5'}],customer:{name:'A'}}]));localStorage.removeItem('omb_bkfix')")
        pg.reload(); pg.evaluate("document.querySelector('#gate') && document.querySelector('#gate').remove()")
        check('stray appointment is removed from invoices on start-up', ev(pg, "invoices.length===1 && invoices[0].id==='i1'"))
        ctx.close()

        # ---------- 10. backup and restore ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "customers.push({id:'c1',name:'Jane',phone:'1',email:'',billing:'',properties:[],updated:1});bookings.push({id:'b1',date:'2026-10-12',time:'09:00',mins:'60',types:['gas'],name:'Jane',updated:1});saveCustomers();saveBookings()")
        src = open('app.js').read()
        check('backup includes appointments', 'invoices, bookings, photos' in src)
        check('restore merges appointments', "d.bookings || []" in src)
        ev(pg, "bookings.length=0;saveBookings()")
        blob = json.dumps({'app': 'omb-gas', 'version': 1, 'settings': {}, 'customers': [], 'records': [], 'invoices': [], 'bookings': [{'id': 'b1', 'date': '2026-10-12', 'time': '09:00', 'mins': '60', 'types': ['gas'], 'name': 'Jane', 'updated': 1}]})
        ev(pg, f"(async()=>{{await restoreBackup(new File([{json.dumps(blob)}],'b.json'))}})()")
        pg.wait_for_timeout(300)
        check('restoring a backup brings appointments back', ev(pg, "bookings.length===1"))
        r = ev(pg, "(async()=>{await restoreBackup(new File(['not json'],'x.json'));return true})()")
        check('a bad backup file is refused without crashing', r is True and not errs, errs)
        ctx.close()

        # ---------- 11. help guide ----------
        ctx, pg, errs = fresh(b)
        n = ev(pg, "HELP.length")
        check('help guide has topics', n >= 20, n)
        check('every help topic has a title, keywords and text', ev(pg, "HELP.every(x=>x&&x.t&&x.k&&x.h)"))
        ev(pg, "ui.view='help';ui.helpQ='';render()")
        pg.fill('#helpSearch', 'calendar'); pg.dispatch_event('#helpSearch', 'input')
        check('help search finds the calendar topic', 'Calendar and appointments' in ev(pg, "document.querySelector('#view').innerText"))
        ctx.close()


        # ---------- 12. form validation ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        for t in ['gas', 'service', 'legionella', 'aircon']:
            r = ev(pg, f"(()=>{{const blank=newRecord(null,'{t}');const done=records.find(r=>typeOf(r)==='{t}');const v=x=>{{const o=validate(x);return Array.isArray(o)?o.length:Object.keys(o||{{}}).length}};return [v(blank),v(done)]}})()")
            check(f'validation flags a blank {t} form and passes the finished example', r[0] > 0 and r[1] == 0, r)
        check('no page errors in validation', not errs, errs)
        ctx.close()

        # ---------- 13. offline (service worker) ----------
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        pg = ctx.new_page()
        pg.goto(URL)
        pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.ready.then(()=>true)", timeout=15000)
        pg.wait_for_timeout(2500)
        ctx.set_offline(True)
        try:
            pg.reload()
            pg.wait_for_timeout(800)
            ok = pg.evaluate("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        except Exception as e:
            ok = False
        check('app opens with no signal (service worker cache)', ok)
        ctx.close()

        b.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
